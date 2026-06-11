import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import Anthropic from '@anthropic-ai/sdk';

import type { FrankWeeklyPayload } from '@simplyfpl/types';

import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const FEATURE_FRANK_ONDEMAND_SERVER = process.env['FEATURE_FRANK_ONDEMAND'] === 'true';
const FRANK_MODEL = 'claude-haiku-4-5-20251001';
const API_BASE_URL = process.env['API_URL'] ?? 'http://localhost:8787';

export const runtime = 'edge';

interface AskBody {
  question: string;
}

function isAskBody(value: unknown): value is AskBody {
  return (
    typeof value === 'object' && value !== null && typeof (value as AskBody).question === 'string'
  );
}

export async function POST(request: NextRequest) {
  if (!FEATURE_FRANK_ONDEMAND_SERVER) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 503 });
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.tier !== 'ultimate') {
    return NextResponse.json({ error: 'Ultimate tier required' }, { status: 402 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!isAskBody(body) || !body.question.trim()) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 });
  }

  const question = body.question.trim().slice(0, 500);

  let weeklyContext = '';
  try {
    const weeklyRes = await fetch(`${API_BASE_URL}/frank/weekly`);
    if (weeklyRes.ok) {
      const weekly = (await weeklyRes.json()) as FrankWeeklyPayload;
      weeklyContext = JSON.stringify({
        gameweek: weekly.gameweek,
        captainCandidates: weekly.captainCandidates,
        transferTargets: weekly.transferTargets,
        chipNote: weekly.chipNote,
      });
    }
  } catch {
    // weekly context is best-effort
  }

  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }

  const client = new Anthropic({ apiKey });

  const systemParts: Anthropic.TextBlockParam[] = [
    {
      type: 'text',
      text:
        'You are Frank, an AI FPL (Fantasy Premier League) coach. ' +
        "Answer the user's question concisely and helpfully. " +
        'Be specific: reference players, teams, fixtures, and prices where relevant. ' +
        'Keep your answer under 150 words.',
    },
  ];

  if (weeklyContext) {
    systemParts.push({
      type: 'text',
      text: `This week's FPL context: ${weeklyContext}`,
      cache_control: { type: 'ephemeral' },
    });
  }

  const message = await client.messages.create({
    model: FRANK_MODEL,
    max_tokens: 512,
    system: systemParts,
    messages: [{ role: 'user', content: question }],
  });

  const answer = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block: Anthropic.TextBlock) => block.text)
    .join('');

  const admin = getSupabaseAdminClient();
  try {
    await admin.from('frank_queries').insert({
      user_id: user.id,
      question,
      response: { answer },
      model: FRANK_MODEL,
      tokens_in: message.usage.input_tokens,
      tokens_out: message.usage.output_tokens,
    });
  } catch {
    // log to frank_queries is best-effort; don't fail the response
  }

  return NextResponse.json({ answer });
}
