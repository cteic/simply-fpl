import type { FplBootstrapStatic, FplEntryGameweekPicks, FplLiveGameweek } from '@simplyfpl/types';

import { fetchPicksBatch, fetchRandomEntries, fetchTopEntries } from './cohort/fetch';
import type { CohortSnapshot, CohortWip } from './cohort/types';

export { LiveGwDO } from './live-gw-do';

export interface Env {
  FPL_CACHE: KVNamespace;
  LIVE_GW: DurableObjectNamespace;
  FPL_BASE_URL: string;
  BOOTSTRAP_TTL: string;
  LIVE_GW_TTL: string;
  ENTRY_TTL: string;
  LEAGUE_TTL: string;
  COHORT_ADMIN_TOKEN: string;
}

const FPL_HOST = 'https://fantasy.premierleague.com';
const FPL_ORIGIN = `${FPL_HOST}/api`;
const FPL_CDN_ORIGIN = `${FPL_HOST}/dist/img/shirts/standard`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const COHORT_NAMES = ['top10k', 'overall'] as const;
type CohortName = (typeof COHORT_NAMES)[number];

const COHORT_SIZE = 10000;
const PICKS_PER_FIRING = 400;
const ESTIMATED_OVERALL_PAGES = 260000;
const COHORT_KV_TTL = 7 * 24 * 3600;

// Route → cache TTL mapping (seconds)
function getTtl(pathname: string): number {
  if (pathname.includes('bootstrap-static')) return 3600; // 1 hour
  if (pathname.includes('/live/')) return 60; // 1 minute
  if (pathname.includes('leagues-classic')) return 90; // 90 seconds
  if (pathname.includes('/entry/') && pathname.includes('/picks/')) return 120;
  if (pathname.includes('/entry/')) return 300;
  if (pathname.includes('/fixtures/')) return 600; // 10 minutes
  return 120;
}

async function fetchWithCache(
  env: Env,
  ctx: ExecutionContext,
  cacheKey: string,
  upstreamUrl: string,
  ttl: number
): Promise<Response> {
  // Try KV cache first
  const cached = await env.FPL_CACHE.get(cacheKey, 'text');
  if (cached) {
    return new Response(cached, {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'X-Cache': 'HIT',
      },
    });
  }

  // Fetch from FPL
  const upstream = await fetch(upstreamUrl, {
    headers: {
      'User-Agent': 'SimplyFPL/1.0',
      Accept: 'application/json',
    },
  });

  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: 'FPL API error', status: upstream.status }), {
      status: upstream.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const body = await upstream.text();

  // Store in KV (fire and forget)
  ctx.waitUntil(
    env.FPL_CACHE.put(cacheKey, body, { expirationTtl: ttl }).catch(() => {
      // KV write failure is non-fatal
    })
  );

  return new Response(body, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'X-Cache': 'MISS',
    },
  });
}

const KIT_FALLBACK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="110" height="110">' +
  '<path d="M8 8h12l2 4v8H6v-8l2-4z" fill="#9CA3AF"/>' +
  '<path d="M11 8v12M17 8v12" stroke="white" stroke-width="1.3"/>' +
  '</svg>';

function kitFallbackResponse(): Response {
  return new Response(KIT_FALLBACK_SVG, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=300',
      'X-Kit-Fallback': '1',
    },
  });
}

async function handleKit(ctx: ExecutionContext, pathname: string): Promise<Response> {
  const match = pathname.match(/^\/kits\/(?:(gk)-)?(\d+)-(110|220)\.webp$/);
  if (!match) return kitFallbackResponse();

  const isGk = match[1] === 'gk';
  const teamCode = match[2];
  const size = match[3];

  const upstreamPath = isGk ? `shirt_${teamCode}_1-${size}.webp` : `shirt_${teamCode}-${size}.webp`;
  const upstreamUrl = `${FPL_CDN_ORIGIN}/${upstreamPath}`;

  const cache = caches.default;
  const cacheKey = new Request(`https://kit-cache.simplyfpl/${pathname}`);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const upstream = await fetch(upstreamUrl, {
    headers: { 'User-Agent': 'SimplyFPL/1.0', Accept: 'image/webp,image/*' },
  });
  if (!upstream.ok) return kitFallbackResponse();

  const body = await upstream.arrayBuffer();
  const response = new Response(body, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=604800, immutable',
      'X-Cache': 'MISS',
    },
  });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

async function getCurrentGameweek(env: Env): Promise<number | null> {
  const cacheKey = 'fpl:/bootstrap-static/';
  const cached = await env.FPL_CACHE.get(cacheKey, 'text');
  const raw =
    cached ??
    (await (async () => {
      const res = await fetch(`${env.FPL_BASE_URL}/bootstrap-static/`, {
        headers: { 'User-Agent': 'SimplyFPL/1.0', Accept: 'application/json' },
      });
      return res.ok ? res.text() : null;
    })());

  if (raw === null) return null;

  const bootstrap = JSON.parse(raw) as FplBootstrapStatic;
  const current = bootstrap.events.find((e) => e.is_current);
  return current?.id ?? null;
}

async function getLiveGw(env: Env, gameweek: number): Promise<FplLiveGameweek | null> {
  const cacheKey = `fpl:/event/${gameweek}/live/`;
  const cached = await env.FPL_CACHE.get(cacheKey, 'text');
  if (cached !== null) return JSON.parse(cached) as FplLiveGameweek;

  const res = await fetch(`${env.FPL_BASE_URL}/event/${gameweek}/live/`, {
    headers: { 'User-Agent': 'SimplyFPL/1.0', Accept: 'application/json' },
  });
  if (!res.ok) return null;

  const text = await res.text();
  return JSON.parse(text) as FplLiveGameweek;
}

function wipToSnapshot(wip: CohortWip): CohortSnapshot {
  const { processedCount } = wip;

  const playerOwnership: Record<number, number> = {};
  for (const [rawId, count] of Object.entries(wip.playerOwnerCount)) {
    const id = Number(rawId);
    playerOwnership[id] = ((count ?? 0) / processedCount) * 100;
  }

  const captainOwnership: Record<number, number> = {};
  for (const [rawId, count] of Object.entries(wip.captainOwnerCount)) {
    const id = Number(rawId);
    captainOwnership[id] = ((count ?? 0) / processedCount) * 100;
  }

  return {
    cohortName: wip.cohortName,
    gameweek: wip.gameweek,
    capturedAt: new Date().toISOString(),
    sampleSize: processedCount,
    averageScore: wip.totalScore / processedCount,
    averagePlayersPlayed: wip.totalPlayersPlayed / processedCount,
    averageBudgetUsed: 0,
    averageCaptainPoints: wip.totalCaptainPoints / processedCount,
    playerOwnership,
    captainOwnership,
    topThreshold: wip.topThreshold,
  };
}

function accumulateIntoBatch(
  wip: CohortWip,
  entryPicks: Array<{ entryId: number; picks: FplEntryGameweekPicks }>,
  liveGw: FplLiveGameweek
): void {
  const livePointsById = new Map<number, number>(
    liveGw.elements.map((el) => [el.id, el.stats.total_points])
  );
  const liveMinutesById = new Map<number, number>(
    liveGw.elements.map((el) => [el.id, el.stats.minutes])
  );

  for (const { picks: entryGwPicks } of entryPicks) {
    const { picks } = entryGwPicks;
    let entryScore = 0;
    let entryPlayersPlayed = 0;
    let entryCaptainPoints = 0;

    for (const pick of picks) {
      const livePoints = livePointsById.get(pick.element) ?? 0;
      const minutes = liveMinutesById.get(pick.element) ?? 0;

      wip.playerOwnerCount[pick.element] = (wip.playerOwnerCount[pick.element] ?? 0) + 1;

      if (pick.is_captain) {
        wip.captainOwnerCount[pick.element] = (wip.captainOwnerCount[pick.element] ?? 0) + 1;
        entryCaptainPoints = livePoints * pick.multiplier;
      }

      if (pick.multiplier > 0) {
        entryScore += livePoints * pick.multiplier;
        if (minutes > 0) entryPlayersPlayed++;
      }
    }

    wip.totalScore += entryScore;
    wip.totalPlayersPlayed += entryPlayersPlayed;
    wip.totalCaptainPoints += entryCaptainPoints;
    wip.topThreshold = entryGwPicks.entry_history.points;
    wip.processedCount++;
  }
}

async function runCohortBatch(
  env: Env,
  gameweek: number,
  cohortName: CohortName
): Promise<{ status: 'processing' | 'done'; remaining: number }> {
  const wipKey = `cohort:wip:gw:${gameweek}:${cohortName}`;
  const finalKey = `cohort:gw:${gameweek}:${cohortName}`;

  const wipRaw = await env.FPL_CACHE.get(wipKey, 'text');
  let wip: CohortWip;

  if (wipRaw === null) {
    const entryIds =
      cohortName === 'overall'
        ? await fetchRandomEntries(env.FPL_BASE_URL, COHORT_SIZE, ESTIMATED_OVERALL_PAGES, fetch)
        : await fetchTopEntries(env.FPL_BASE_URL, COHORT_SIZE, fetch);

    wip = {
      cohortName,
      gameweek,
      startedAt: new Date().toISOString(),
      remainingIds: entryIds,
      processedCount: 0,
      playerOwnerCount: {},
      captainOwnerCount: {},
      totalScore: 0,
      totalPlayersPlayed: 0,
      totalCaptainPoints: 0,
      topThreshold: 0,
    };
  } else {
    wip = JSON.parse(wipRaw) as CohortWip;
  }

  if (wip.remainingIds.length === 0) {
    return { status: 'done', remaining: 0 };
  }

  const batch = wip.remainingIds.slice(0, PICKS_PER_FIRING);
  wip.remainingIds = wip.remainingIds.slice(PICKS_PER_FIRING);

  const liveGw = await getLiveGw(env, gameweek);
  if (liveGw !== null) {
    const picksResult = await fetchPicksBatch(env.FPL_BASE_URL, batch, gameweek, fetch);
    accumulateIntoBatch(wip, picksResult, liveGw);
  }

  await env.FPL_CACHE.put(wipKey, JSON.stringify(wip), {
    expirationTtl: COHORT_KV_TTL,
  });

  if (wip.remainingIds.length === 0 && wip.processedCount > 0) {
    const snapshot = wipToSnapshot(wip);
    await env.FPL_CACHE.put(finalKey, JSON.stringify(snapshot), {
      expirationTtl: COHORT_KV_TTL,
    });
    await env.FPL_CACHE.delete(wipKey);
    return { status: 'done', remaining: 0 };
  }

  return { status: 'processing', remaining: wip.remainingIds.length };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Route: GET /cohort/:gw/:cohortName
    const cohortReadMatch = url.pathname.match(/^\/cohort\/(\d+)\/(top10k|overall|top25k)$/);
    if (cohortReadMatch && request.method === 'GET') {
      const gw = cohortReadMatch[1];
      const cohortName = cohortReadMatch[2];
      const key = `cohort:gw:${gw}:${cohortName}`;
      const data = await env.FPL_CACHE.get(key, 'text');
      if (data === null) {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      return new Response(data, {
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    // Route: POST /cohort/admin/backfill/:gw
    const backfillMatch = url.pathname.match(/^\/cohort\/admin\/backfill\/(\d+)$/);
    if (backfillMatch && request.method === 'POST') {
      const token = request.headers.get('Authorization');
      if (token !== `Bearer ${env.COHORT_ADMIN_TOKEN}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const gameweek = Number(backfillMatch[1]);
      const results: Record<string, { status: string; remaining: number }> = {};

      for (const cohortName of COHORT_NAMES) {
        results[cohortName] = await runCohortBatch(env, gameweek, cohortName);
      }

      const allDone = Object.values(results).every((r) => r.status === 'done');
      return new Response(
        JSON.stringify({ status: allDone ? 'done' : 'processing', cohorts: results }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Route: /live/ws?gw=N → LiveGwDO WebSocket
    if (url.pathname === '/live/ws' || url.pathname === '/live/ws/') {
      const gw = url.searchParams.get('gw');
      if (!gw || !/^\d+$/.test(gw)) {
        return new Response(JSON.stringify({ error: 'Missing or invalid ?gw=' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      const id = env.LIVE_GW.idFromName(`gw:${gw}`);
      const stub = env.LIVE_GW.get(id);
      return stub.fetch(request);
    }

    // Route: /kits/* → FPL kit image proxy
    if (url.pathname.startsWith('/kits/')) {
      return handleKit(ctx, url.pathname);
    }

    // Route: /fpl/* → proxy to FPL API
    const fplMatch = url.pathname.match(/^\/fpl(\/.+)$/);
    if (!fplMatch || !fplMatch[1]) {
      return new Response(JSON.stringify({ error: 'Not found', path: url.pathname }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const fplPath = fplMatch[1];
    const upstreamUrl = `${FPL_ORIGIN}${fplPath}`;
    const cacheKey = `fpl:${fplPath}`;
    const ttl = getTtl(fplPath);

    return fetchWithCache(env, ctx, cacheKey, upstreamUrl, ttl);
  },

  async scheduled(event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const gameweek = await getCurrentGameweek(env);
    if (gameweek === null) return;

    for (const cohortName of COHORT_NAMES) {
      await runCohortBatch(env, gameweek, cohortName);
    }
  },
};
