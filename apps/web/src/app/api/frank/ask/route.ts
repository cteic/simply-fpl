import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import Anthropic from '@anthropic-ai/sdk';

import {
  buildEnrichedContext,
  computeFrankAskCacheKey,
  quotaWindowStart,
  resolveFrankAccess,
} from '@simplyfpl/features/frank';
import { resolveTier } from '@simplyfpl/features/subscriptions/entitlement';
import type { FplEntrySnapshot, FplFixture, FrankWeeklyPayload } from '@simplyfpl/types';

import type { BudgetStore } from '@/lib/frank-budget';
import {
  FRANK_RESERVE_TOKENS,
  reserveDailyTokens,
  resolveDailyCap,
  settleDailyTokens,
} from '@/lib/frank-budget';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const FEATURE_FRANK_ONDEMAND_SERVER = process.env['FEATURE_FRANK_ONDEMAND'] === 'true';
const FRANK_MODEL = 'claude-haiku-5-5';
// Haiku 5.5 runs adaptive thinking by default, and thinking counts toward
// max_tokens. Frank answers in under 200 words, but at the old 512 cap a
// response can stop after a thinking block having produced no text at all,
// so leave headroom. Lowering effort would be the better lever; that needs
// an @anthropic-ai/sdk major upgrade, which this SDK version predates.
const FRANK_MAX_TOKENS = 1536;
const API_BASE_URL = process.env['API_URL'] ?? 'http://localhost:8787';
const FRANK_CACHE_WRITE_SECRET = process.env['FRANK_CACHE_WRITE_SECRET'];
const FRANK_DAILY_SPEND_CAP = resolveDailyCap(process.env['FRANK_DAILY_SPEND_CAP_TOKENS']);

// Opens on-demand questions to free and Pro users, each with their own quota.
// Off unless set to the literal string 'true'.
const FRANK_FREE_TIER = process.env['FEATURE_FRANK_FREE_TIER'] === 'true';
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

/**
 * The pre-migration budget check: sum today's recorded tokens and compare.
 *
 * Not atomic, and it scans a growing table, which is why it is no longer the
 * primary check. Kept only as the fallback for when frank_reserve_tokens cannot
 * be reached, so that case is no worse than before.
 */
async function legacyBudgetExceeded(
  client: ReturnType<typeof getSupabaseAdminClient>,
  cap: number
): Promise<boolean> {
  try {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { data: todayRows } = await client
      .from('frank_queries')
      .select('tokens_in, tokens_out')
      .gte('created_at', startOfDay.toISOString());
    const todayTokens = (todayRows ?? []).reduce(
      (sum: number, row: { tokens_in?: number | null; tokens_out?: number | null }) =>
        sum + (row.tokens_in ?? 0) + (row.tokens_out ?? 0),
      0
    );
    return todayTokens >= cap;
  } catch {
    return false;
  }
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
  const access = resolveFrankAccess(tier, { freeTierEnabled: FRANK_FREE_TIER });
  const quota = access.quota;

  if (!access.canAskOnDemand || quota === null) {
    return NextResponse.json(
      { error: 'Ultimate tier required', tier, upgradeTo: access.upgradeTo },
      { status: 402 }
    );
  }

  // A tier's allowance is counted over its own window: a week for free users,
  // a month for paying ones.
  const windowStart = quotaWindowStart(quota.period);
  const quotaReachedBody = (usedSoFar: number) => ({
    error: quota.period === 'week' ? 'Weekly quota reached' : 'Monthly quota reached',
    used: usedSoFar,
    limit: quota.hard,
    period: quota.period,
    upgradeTo: access.upgradeTo,
  });

  const admin = getSupabaseAdminClient();

  const { count: monthlyCount } = await admin
    .from('frank_queries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', windowStart.toISOString());

  const used = monthlyCount ?? 0;

  if (used >= quota.hard) {
    return NextResponse.json(quotaReachedBody(used), { status: 429 });
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
          softCap: quota.soft,
          hardCap: quota.hard,
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
    .gte('created_at', windowStart.toISOString());

  const usedWithReservation = reservedCount ?? used + 1;

  if (usedWithReservation > quota.hard) {
    await admin.from('frank_queries').delete().eq('id', reservation.id);
    return NextResponse.json(quotaReachedBody(usedWithReservation - 1), { status: 429 });
  }

  // Hold tokens out of today's budget before the model is called. This is one
  // statement in Postgres, so two requests arriving together cannot both read
  // the pre-spend total and both proceed, which the old sum-then-decide check
  // allowed.
  const budgetStore: BudgetStore = {
    reserve: (tokens, cap) => admin.rpc('frank_reserve_tokens', { p_tokens: tokens, p_cap: cap }),
    settle: (delta) => admin.rpc('frank_settle_tokens', { p_delta: delta }),
  };
  let budget = await reserveDailyTokens(budgetStore, FRANK_RESERVE_TOKENS, FRANK_DAILY_SPEND_CAP);
  if (budget === 'unavailable') {
    // The budget function is not deployed yet, or errored. Fall back to the old
    // check rather than run with no cap, or take Frank down over a migration.
    budget = (await legacyBudgetExceeded(admin, FRANK_DAILY_SPEND_CAP))
      ? 'over-cap'
      : 'unavailable';
  }
  if (budget === 'over-cap') {
    await admin.from('frank_queries').delete().eq('id', reservation.id);
    return NextResponse.json({
      advice: weeklyContext
        ? `Daily AI budget reached. This week's general advice: ${weeklyContext}`
        : 'Daily AI budget reached. Please try again tomorrow.',
      follow_up_question: null,
      used,
      softCap: quota.soft,
      hardCap: quota.hard,
    });
  }
  const tokensReserved = budget === 'reserved' ? FRANK_RESERVE_TOKENS : 0;

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  const reservationId = String(reservation.id);
  // A client that closes the tab rejects every later write. That must not abort the run: the
  // tokens are already spent, so the reservation and its usage still have to be recorded.
  const send = (chunk: Uint8Array) => writer.write(chunk).catch(() => undefined);

  void (async () => {
    try {
      const anthropicStream = client.messages.stream({
        model: FRANK_MODEL,
        max_tokens: FRANK_MAX_TOKENS,
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
          await send(sseChunk('token', { text: event.delta.text }));
        }
      }

      const finalMsg = await anthropicStream.finalMessage();
      // Swap the estimate for what was really spent.
      if (tokensReserved > 0) {
        await settleDailyTokens(
          budgetStore,
          tokensReserved,
          finalMsg.usage.input_tokens + finalMsg.usage.output_tokens
        );
      }
      const parsed = parseFrankJson(fullText);
      const advice = parsed?.advice ?? FRANK_PARSE_ERROR;
      const responsePayload: FrankJsonResponse = parsed ?? { advice: FRANK_PARSE_ERROR };

      // Only a well-formed answer is shared through the cache. Caching the parse-error text would
      // serve it to everyone who asks the same question.
      if (FRANK_CACHE_WRITE_SECRET && parsed) {
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

      await send(
        sseChunk('done', {
          advice,
          follow_up_question: parsed?.follow_up_question ?? null,
          used: usedWithReservation,
          softCap: quota.soft,
          hardCap: quota.hard,
        })
      );
    } catch {
      // The model was never paid for, so hand the reservation back.
      if (tokensReserved > 0) await settleDailyTokens(budgetStore, tokensReserved, 0);
      await admin.from('frank_queries').delete().eq('id', reservationId);
      await send(sseChunk('error', { error: 'AI service unavailable' }));
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
