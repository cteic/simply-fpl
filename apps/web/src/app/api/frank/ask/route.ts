import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import Anthropic from '@anthropic-ai/sdk';

import { resolveFrankAccess } from '@simplyfpl/features/frank';
import { resolveTier } from '@simplyfpl/features/subscriptions/entitlement';
import type { FplEntrySnapshot, FrankWeeklyPayload } from '@simplyfpl/types';

import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const FEATURE_FRANK_ONDEMAND_SERVER = process.env['FEATURE_FRANK_ONDEMAND'] === 'true';
const FRANK_MODEL = 'claude-haiku-4-5-20251001';
const API_BASE_URL = process.env['API_URL'] ?? 'http://localhost:8787';

const FRANK_QUOTA_SOFT = 50;
const FRANK_QUOTA_HARD = 80;
const TEAM_CONTEXT_MAX_CHARS = 4000;
const FRANK_PARSE_ERROR = 'Frank had trouble formatting that answer — try rephrasing';

export const runtime = 'edge';

interface AskBody {
  question: string;
}

function isAskBody(value: unknown): value is AskBody {
  return (
    typeof value === 'object' && value !== null && typeof (value as AskBody).question === 'string'
  );
}

interface FrankJsonResponse {
  advice: string;
  supporting_data?: { player_id?: number; gw?: number };
  follow_up_question?: string;
}

function parseFrankJson(raw: string): FrankJsonResponse | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as FrankJsonResponse).advice === 'string'
    ) {
      return parsed as FrankJsonResponse;
    }
    return null;
  } catch {
    return null;
  }
}

function isFplEntrySnapshot(value: unknown): value is FplEntrySnapshot {
  return (
    typeof value === 'object' &&
    value !== null &&
    'gw' in value &&
    typeof (value as FplEntrySnapshot).gw === 'number'
  );
}

function projectSnapshot(raw: unknown): string {
  if (!isFplEntrySnapshot(raw)) return '';
  const projected = {
    gw: raw.gw,
    picks: raw.picks
      ? {
          active_chip: raw.picks.active_chip,
          entry_history: raw.picks.entry_history,
          picks: raw.picks.picks,
        }
      : null,
    entry: raw.entry
      ? {
          summary_overall_rank: raw.entry.summary_overall_rank,
          summary_overall_points: raw.entry.summary_overall_points,
          summary_event_rank: raw.entry.summary_event_rank,
          summary_event_points: raw.entry.summary_event_points,
        }
      : null,
  };
  return JSON.stringify(projected).slice(0, TEAM_CONTEXT_MAX_CHARS);
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
    .select('tier, fpl_entry_id')
    .eq('id', user.id)
    .maybeSingle();

  const tier = resolveTier({ tier: profile?.tier ?? null });
  const access = resolveFrankAccess(tier);

  if (!access.canAskOnDemand) {
    return NextResponse.json(
      { error: 'Ultimate tier required', tier, upgradeTo: access.upgradeTo },
      { status: 402 }
    );
  }

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const { count: monthlyCount } = await supabase
    .from('frank_queries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', startOfMonth.toISOString());

  const used = monthlyCount ?? 0;

  if (used >= FRANK_QUOTA_HARD) {
    return NextResponse.json(
      { error: 'Monthly quota reached', used, limit: FRANK_QUOTA_HARD },
      { status: 429 }
    );
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
  let teamContext = '';

  const [weeklyRes, snapshotRes] = await Promise.allSettled([
    fetch(`${API_BASE_URL}/frank/weekly`),
    profile?.fpl_entry_id
      ? fetch(`${API_BASE_URL}/snapshot/entry/${profile.fpl_entry_id}`)
      : Promise.resolve(null),
  ]);

  if (weeklyRes.status === 'fulfilled' && weeklyRes.value?.ok) {
    try {
      const weekly = (await weeklyRes.value.json()) as FrankWeeklyPayload;
      weeklyContext = JSON.stringify({
        gameweek: weekly.gameweek,
        captainCandidates: weekly.captainCandidates,
        transferTargets: weekly.transferTargets,
        chipNote: weekly.chipNote,
      });
    } catch {
      // best-effort
    }
  }

  if (snapshotRes.status === 'fulfilled' && snapshotRes.value !== null && snapshotRes.value?.ok) {
    try {
      const snapshot: unknown = await snapshotRes.value.json();
      teamContext = projectSnapshot(snapshot);
    } catch {
      // best-effort
    }
  }

  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }

  const client = new Anthropic({ apiKey });

  const contextText = [
    weeklyContext ? `Weekly FPL context: ${weeklyContext}` : '',
    teamContext ? `User's current team: ${teamContext}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const systemParts: Anthropic.TextBlockParam[] = [
    {
      type: 'text',
      text: 'You are Frank, a concise data-driven FPL coach answering one user question about their team. Output JSON: { advice, supporting_data: { player_id?, gw? }, follow_up_question? }. Stay terse — max 200 words.',
    },
  ];

  if (contextText) {
    systemParts.push({
      type: 'text',
      text: contextText,
      cache_control: { type: 'ephemeral' },
    });
  }

  const message = await client.messages.create({
    model: FRANK_MODEL,
    max_tokens: 512,
    system: systemParts,
    messages: [{ role: 'user', content: question }],
  });

  const rawText = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block: Anthropic.TextBlock) => block.text)
    .join('');

  const parsed = parseFrankJson(rawText);
  const advice = parsed?.advice ?? FRANK_PARSE_ERROR;
  const responsePayload: FrankJsonResponse = parsed ?? { advice: FRANK_PARSE_ERROR };

  const admin = getSupabaseAdminClient();
  try {
    await admin.from('frank_queries').insert({
      user_id: user.id,
      question,
      response: responsePayload,
      model: FRANK_MODEL,
      tokens_in: message.usage.input_tokens,
      tokens_out: message.usage.output_tokens,
    });
  } catch {
    // log to frank_queries is best-effort; don't fail the response
  }

  return NextResponse.json({
    advice,
    follow_up_question: parsed?.follow_up_question ?? null,
    used: used + 1,
    softCap: FRANK_QUOTA_SOFT,
    hardCap: FRANK_QUOTA_HARD,
  });
}
