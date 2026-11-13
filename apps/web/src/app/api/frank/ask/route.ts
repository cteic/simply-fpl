import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import Anthropic from '@anthropic-ai/sdk';

import {
  buildEnrichedContext,
  computeFrankAskCacheKey,
  resolveFrankAccess,
} from '@simplyfpl/features/frank';
import { resolveTier } from '@simplyfpl/features/subscriptions/entitlement';
import type { FplEntrySnapshot, FplFixture, FrankWeeklyPayload } from '@simplyfpl/types';

import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const FEATURE_FRANK_ONDEMAND_SERVER = process.env['FEATURE_FRANK_ONDEMAND'] === 'true';
const FRANK_MODEL = 'claude-haiku-4-5-20251001';
const API_BASE_URL = process.env['API_URL'] ?? 'http://localhost:8787';
const FRANK_CACHE_WRITE_SECRET = process.env['FRANK_CACHE_WRITE_SECRET'];
const FRANK_DAILY_SPEND_CAP = process.env['FRANK_DAILY_SPEND_CAP_TOKENS']
  ? Number(process.env['FRANK_DAILY_SPEND_CAP_TOKENS'])
  : null;

const FRANK_QUOTA_SOFT = 50;
const FRANK_QUOTA_HARD = 80;
const FRANK_PARSE_ERROR = 'Frank had trouble formatting that answer — try rephrasing';

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

interface SlimPricesPayload {
  changes: Array<{ id: number; web_name: string; direction: 'rise' | 'fall'; probability: number }>;
}

function isSlimPricesPayload(value: unknown): value is SlimPricesPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as SlimPricesPayload).changes)
  );
}

const enc = new TextEncoder();

function sseChunk(event: string, data: unknown): Uint8Array {
  return enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
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

  const admin = getSupabaseAdminClient();

  const { count: monthlyCount } = await admin
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

  let snapshot: FplEntrySnapshot | null = null;
  if (profile?.fpl_entry_id) {
    try {
      const snapshotRes = await fetch(`${API_BASE_URL}/snapshot/entry/${profile.fpl_entry_id}`);
      if (snapshotRes.ok) {
        const raw: unknown = await snapshotRes.json();
        if (isFplEntrySnapshot(raw)) {
          snapshot = raw;
        }
      }
    } catch {
      // best-effort
    }
  }

  const pickIds = snapshot?.picks?.picks.map((p) => p.element) ?? [];
  const cacheKey = computeFrankAskCacheKey(question, pickIds);

  try {
    const cacheRes = await fetch(
      `${API_BASE_URL}/frank/ask-cache?key=${encodeURIComponent(cacheKey)}`
    );
    if (cacheRes.ok) {
      const cached: unknown = await cacheRes.json();
      if (
        typeof cached === 'object' &&
        cached !== null &&
        typeof (cached as FrankJsonResponse).advice === 'string'
      ) {
        const hit = cached as FrankJsonResponse;
        return NextResponse.json({
          advice: hit.advice,
          follow_up_question: hit.follow_up_question ?? null,
          used,
          softCap: FRANK_QUOTA_SOFT,
          hardCap: FRANK_QUOTA_HARD,
        });
      }
    }
  } catch {
    // best-effort cache lookup
  }

  let weeklyContext = '';
  let fixtures: FplFixture[] | null = null;
  let priceChanges: SlimPricesPayload['changes'] | null = null;

  const [weeklyRes, fixturesRes, pricesRes] = await Promise.allSettled([
    fetch(`${API_BASE_URL}/frank/weekly`),
    fetch(`${API_BASE_URL}/fpl/fixtures-slim`),
    fetch(`${API_BASE_URL}/fpl/prices`),
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

  if (fixturesRes.status === 'fulfilled' && fixturesRes.value?.ok) {
    try {
      const raw: unknown = await fixturesRes.value.json();
      if (Array.isArray(raw)) {
        fixtures = raw as FplFixture[];
      }
    } catch {
      // best-effort
    }
  }

  if (pricesRes.status === 'fulfilled' && pricesRes.value?.ok) {
    try {
      const raw: unknown = await pricesRes.value.json();
      if (isSlimPricesPayload(raw)) {
        priceChanges = raw.changes;
      }
    } catch {
      // best-effort
    }
  }

  if (FRANK_DAILY_SPEND_CAP !== null) {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { data: todayRows } = await admin
      .from('frank_queries')
      .select('tokens_in, tokens_out')
      .gte('created_at', startOfDay.toISOString());
    const todayTokens = (todayRows ?? []).reduce(
      (sum: number, row: { tokens_in?: number | null; tokens_out?: number | null }) =>
        sum + (row.tokens_in ?? 0) + (row.tokens_out ?? 0),
      0
    );
    if (todayTokens >= FRANK_DAILY_SPEND_CAP) {
      return NextResponse.json({
        advice: weeklyContext
          ? `Daily AI budget reached. This week's general advice: ${weeklyContext}`
          : 'Daily AI budget reached. Please try again tomorrow.',
        follow_up_question: null,
        used,
        softCap: FRANK_QUOTA_SOFT,
        hardCap: FRANK_QUOTA_HARD,
      });
    }
  }

  const enrichedContext = buildEnrichedContext({
    snapshot,
    fixtures,
    priceChanges,
    currentGw: snapshot?.gw ?? 0,
  });

  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }

  const client = new Anthropic({ apiKey });

  const contextParts: string[] = [];
  if (weeklyContext) contextParts.push(`Weekly FPL context: ${weeklyContext}`);
  if (enrichedContext) contextParts.push(`User's current team: ${enrichedContext}`);
  const contextText = contextParts.join('\n\n');

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

  const { data: reservation, error: reservationError } = await admin
    .from('frank_queries')
    .insert({ user_id: user.id, question })
    .select('id')
    .single();

  if (reservationError || !reservation) {
    return NextResponse.json({ error: 'Quota reservation failed' }, { status: 500 });
  }

  const { count: reservedCount } = await admin
    .from('frank_queries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', startOfMonth.toISOString());

  const usedWithReservation = reservedCount ?? used + 1;

  if (usedWithReservation > FRANK_QUOTA_HARD) {
    await admin.from('frank_queries').delete().eq('id', reservation.id);
    return NextResponse.json(
      { error: 'Monthly quota reached', used: usedWithReservation - 1, limit: FRANK_QUOTA_HARD },
      { status: 429 }
    );
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  const reservationId = String(reservation.id);

  void (async () => {
    try {
      const anthropicStream = client.messages.stream({
        model: FRANK_MODEL,
        max_tokens: 512,
        system: systemParts,
        messages: [{ role: 'user', content: question }],
      });

      let fullText = '';
      for await (const event of anthropicStream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta' &&
          event.delta.text
        ) {
          fullText += event.delta.text;
          await writer.write(sseChunk('token', { text: event.delta.text }));
        }
      }

      const finalMsg = await anthropicStream.finalMessage();
      const parsed = parseFrankJson(fullText);
      const advice = parsed?.advice ?? FRANK_PARSE_ERROR;
      const responsePayload: FrankJsonResponse = parsed ?? { advice: FRANK_PARSE_ERROR };

      if (FRANK_CACHE_WRITE_SECRET) {
        fetch(`${API_BASE_URL}/frank/ask-cache?key=${encodeURIComponent(cacheKey)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Frank-Cache-Secret': FRANK_CACHE_WRITE_SECRET,
          },
          body: JSON.stringify(responsePayload),
        }).catch(() => undefined);
      }

      try {
        await admin
          .from('frank_queries')
          .update({
            response: responsePayload,
            model: FRANK_MODEL,
            tokens_in: finalMsg.usage.input_tokens,
            tokens_out: finalMsg.usage.output_tokens,
          })
          .eq('id', reservationId);
      } catch {
        // best-effort
      }

      await writer.write(
        sseChunk('done', {
          advice,
          follow_up_question: parsed?.follow_up_question ?? null,
          used: usedWithReservation,
          softCap: FRANK_QUOTA_SOFT,
          hardCap: FRANK_QUOTA_HARD,
        })
      );
    } catch {
      await admin.from('frank_queries').delete().eq('id', reservationId);
      await writer.write(sseChunk('error', { error: 'AI service unavailable' }));
    } finally {
      writer.close().catch(() => undefined);
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
