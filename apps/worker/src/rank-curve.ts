import { GLOBAL_LEAGUE_ID, RANK_CURVE_SAMPLE_PAGES, buildRankCurve } from '@simplyfpl/fpl-client';
import type { FplBootstrapStatic, FplEvent, RankCurve, RankCurveSample } from '@simplyfpl/types';

export interface RankCurveEnv {
  FPL_CACHE: KVNamespace;
  FPL_BASE_URL: string;
}

export interface RankCurveResult {
  status: number;
  body: RankCurve | { error: string };
  cache: 'HIT' | 'MISS';
}

/**
 * The curve only moves when a gameweek settles, so it can be cached hard. The
 * key carries the gameweek, so a new one lands under a new key rather than
 * waiting for this to expire.
 */
export const RANK_CURVE_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Upstream pages to request at once. Keeps 42 requests from going out in one burst. */
const SAMPLE_BATCH_SIZE = 8;

export function rankCurveCacheKey(gw: number): string {
  return `rank-curve:gw${gw}`;
}

/**
 * The most recent gameweek whose ranks FPL has finished checking.
 *
 * The curve maps settled cumulative totals, so it must come from a gameweek
 * whose standings are final. `is_current` is no use here: an event keeps that
 * flag until the next deadline, so it is set on gameweeks that have finished
 * and on the one in progress alike.
 */
export function latestSettledEvent(bootstrap: FplBootstrapStatic): FplEvent | null {
  let latest: FplEvent | null = null;
  for (const event of bootstrap.events) {
    if (event.finished !== true) continue;
    if (event.data_checked !== true) continue;
    if (latest === null || event.id > latest.id) latest = event;
  }
  return latest;
}

function isBootstrap(value: unknown): value is FplBootstrapStatic {
  if (typeof value !== 'object' || value === null) return false;
  const candidate: { events?: unknown } = value;
  return Array.isArray(candidate.events);
}

function isRankCurve(value: unknown): value is RankCurve {
  if (typeof value !== 'object' || value === null) return false;
  const candidate: { gw?: unknown; rankedCount?: unknown; points?: unknown } = value;
  return (
    typeof candidate.gw === 'number' &&
    typeof candidate.rankedCount === 'number' &&
    Array.isArray(candidate.points)
  );
}

interface StandingsRow {
  rank?: unknown;
  total?: unknown;
}

function readPage(payload: unknown): RankCurveSample | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const envelope: { standings?: { results?: unknown } } = payload;
  const { standings } = envelope;
  if (typeof standings !== 'object' || standings === null) return null;
  const results = standings.results;
  if (!Array.isArray(results) || results.length === 0) return null;
  const first: StandingsRow | undefined = results[0];
  if (typeof first !== 'object' || first === null) return null;
  if (typeof first.rank !== 'number' || typeof first.total !== 'number') return null;
  return { rank: first.rank, totalPoints: first.total };
}

async function fetchPage(env: RankCurveEnv, page: number): Promise<RankCurveSample | null> {
  const url = `${env.FPL_BASE_URL}/leagues-classic/${GLOBAL_LEAGUE_ID}/standings/?page_standings=${page}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SimplyFPL/1.0', Accept: 'application/json' },
  }).catch(() => null);
  if (!res || !res.ok) return null;
  const payload = await res.json().catch(() => null);
  return readPage(payload);
}

/**
 * Sample the global league to build FPL's points-to-rank curve for the latest
 * settled gameweek.
 *
 * Pages that fail are skipped rather than failing the build: the curve
 * interpolates, so losing one sample widens a gap instead of breaking it.
 * `buildRankCurve` rejects the result if too few came back.
 */
export async function buildCurveFromUpstream(
  env: RankCurveEnv,
  bootstrap: FplBootstrapStatic
): Promise<RankCurve | null> {
  const settled = latestSettledEvent(bootstrap);
  if (!settled) return null;

  const rankedCount = settled.ranked_count;
  if (typeof rankedCount !== 'number' || rankedCount <= 0) return null;

  const samples: RankCurveSample[] = [];
  for (let i = 0; i < RANK_CURVE_SAMPLE_PAGES.length; i += SAMPLE_BATCH_SIZE) {
    const batch = RANK_CURVE_SAMPLE_PAGES.slice(i, i + SAMPLE_BATCH_SIZE);
    const settledBatch = await Promise.all(batch.map((page) => fetchPage(env, page)));
    for (const sample of settledBatch) {
      if (sample !== null) samples.push(sample);
    }
  }

  return buildRankCurve({ gw: settled.id, rankedCount, samples });
}

async function readBootstrap(env: RankCurveEnv): Promise<FplBootstrapStatic | null> {
  const cached = await env.FPL_CACHE.get('fpl:/bootstrap-static/', 'text');
  if (cached !== null) {
    try {
      const parsed: unknown = JSON.parse(cached);
      if (isBootstrap(parsed)) return parsed;
    } catch {
      // fall through and fetch
    }
  }
  const res = await fetch(`${env.FPL_BASE_URL}/bootstrap-static/`, {
    headers: { 'User-Agent': 'SimplyFPL/1.0', Accept: 'application/json' },
  }).catch(() => null);
  if (!res || !res.ok) return null;
  const parsed: unknown = await res.json().catch(() => null);
  return isBootstrap(parsed) ? parsed : null;
}

export async function handleRankCurve(
  env: RankCurveEnv,
  ctx: ExecutionContext
): Promise<RankCurveResult> {
  const bootstrap = await readBootstrap(env);
  if (!bootstrap) {
    return { status: 502, body: { error: 'bootstrap fetch failed' }, cache: 'MISS' };
  }

  const settled = latestSettledEvent(bootstrap);
  if (!settled) {
    return { status: 404, body: { error: 'no settled gameweek yet' }, cache: 'MISS' };
  }

  const cacheKey = rankCurveCacheKey(settled.id);
  const cached = await env.FPL_CACHE.get(cacheKey, 'text');
  if (cached !== null) {
    try {
      const parsed: unknown = JSON.parse(cached);
      if (isRankCurve(parsed)) return { status: 200, body: parsed, cache: 'HIT' };
    } catch {
      // fall through and rebuild
    }
  }

  const curve = await buildCurveFromUpstream(env, bootstrap);
  if (!curve) {
    return { status: 502, body: { error: 'rank curve build failed' }, cache: 'MISS' };
  }

  ctx.waitUntil(
    env.FPL_CACHE.put(cacheKey, JSON.stringify(curve), {
      expirationTtl: RANK_CURVE_TTL_SECONDS,
    }).catch(() => undefined)
  );
  return { status: 200, body: curve, cache: 'MISS' };
}

/** Build and cache the curve ahead of demand, for the scheduled warm. */
export async function warmRankCurve(
  env: RankCurveEnv,
  bootstrap: FplBootstrapStatic
): Promise<void> {
  const settled = latestSettledEvent(bootstrap);
  if (!settled) return;
  const cacheKey = rankCurveCacheKey(settled.id);
  const existing = await env.FPL_CACHE.get(cacheKey, 'text');
  if (existing !== null) return;
  const curve = await buildCurveFromUpstream(env, bootstrap);
  if (!curve) return;
  await env.FPL_CACHE.put(cacheKey, JSON.stringify(curve), {
    expirationTtl: RANK_CURVE_TTL_SECONDS,
  }).catch(() => undefined);
}
