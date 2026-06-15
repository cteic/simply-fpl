import type { BrowserWorker } from '@cloudflare/puppeteer';

import { handleBootstrapSlim } from './bootstrap';
import { runScheduled } from './cohort/cohort';
import { handleCohortAggregates } from './cohort/serve';
import { handleFixturesSlim } from './fixtures';
import { FRANK_WEEKLY_CRON, handleFrankWeekly, runFrankWeekly } from './frank/weekly-cache';
import { GW38_CAPTURE_CRON, GW38_CAPTURE_GW, isWithinGw38CaptureWindow } from './gw38-capture';
import { handleLeagueSummary } from './leagues';
import { runCaptainScoredCheck } from './notify/captain-scored';
import { runDeadlineReminder } from './notify/deadline-reminder';
import { dispatchNotification } from './notify/dispatch';
import { buildFplPassthroughTarget, matchFplRoute } from './passthrough';
import { handlePrices, warmPricesCache } from './prices';
import { RIVALS_WARM_CRON, runRivalsWarm } from './rivals-warm';
import { handleEntrySnapshot } from './snapshot';
import {
  handleVsData,
  handleVsDebugMeasure,
  handleVsScreenshot,
  handleVsTimedFetch,
} from './vs/routes';
import { runComparison } from './vs/scheduled';
import { checkRateLimit } from './vs/timed-fetch';

export { LiveGwDO } from './live-gw-do';

export interface Env {
  FPL_CACHE: KVNamespace;
  FRANK_WEEKLY_CACHE: KVNamespace;
  LIVE_GW: DurableObjectNamespace;
  VS_BUCKET: R2Bucket;
  RECORDINGS_R2?: R2Bucket;
  BROWSER: BrowserWorker;
  FPL_BASE_URL: string;
  BOOTSTRAP_TTL: string;
  LIVE_GW_TTL: string;
  ENTRY_TTL: string;
  LEAGUE_TTL: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE?: string;
  ANTHROPIC_API_KEY?: string;
  GIT_SHA?: string;
  ENVIRONMENT?: string;
  VS_DEBUG_TOKEN?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  NOTIFY_DISPATCH_SECRET?: string;
}

const VS_COMPARISON_CRON = '0 6 * * 1';
const DEADLINE_REMINDER_CRON = '30 17 * * *';

const PUBLIC_RATE_LIMIT = 120;
const STATUS_RATE_LIMIT = 10;
const RL_KEY_PREFIX = 'rl:';

const FPL_HOST = 'https://fantasy.premierleague.com';
const FPL_ORIGIN = `${FPL_HOST}/api`;
const FPL_CDN_ORIGIN = `${FPL_HOST}/dist/img/shirts/standard`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function enforceRateLimit(env: Env, ip: string, limit: number): Promise<Response | null> {
  const check = await checkRateLimit(env.FPL_CACHE, `${RL_KEY_PREFIX}${limit}:${ip}`, Date.now());
  if (!check.allowed) {
    return new Response(
      JSON.stringify({ error: 'rate_limited', retryAfterSeconds: check.retryAfterSeconds }),
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'Retry-After': String(check.retryAfterSeconds),
        },
      }
    );
  }
  return null;
}

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

type StatusValue = 'ok' | 'degraded' | 'down' | `error: ${string}`;

interface StatusResponse {
  worker: 'ok';
  kv: StatusValue;
  fpl: StatusValue;
  durable_object: StatusValue;
  version: string;
  timestamp: string;
}

async function checkKv(env: Env): Promise<StatusValue> {
  try {
    const key = 'health-check';
    const value = `ping:${Date.now()}`;
    await env.FPL_CACHE.put(key, value, { expirationTtl: 60 });
    const read = await env.FPL_CACHE.get(key);
    if (read !== value) {
      return `error: kv readback mismatch`;
    }
    return 'ok';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `error: ${msg}`;
  }
}

async function checkFpl(env: Env): Promise<StatusValue> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${env.FPL_BASE_URL}/bootstrap-static/`, {
      headers: { 'User-Agent': 'SimplyFPL/1.0 (status-check)', Accept: 'application/json' },
      signal: controller.signal,
    });
    if (res.status === 200) return 'ok';
    if (res.status >= 500) return 'down';
    return 'degraded';
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return 'down';
    return 'down';
  } finally {
    clearTimeout(timeout);
  }
}

async function checkDurableObject(env: Env): Promise<StatusValue> {
  try {
    const id = env.LIVE_GW.idFromName('status-probe');
    const stub = env.LIVE_GW.get(id);
    if (!stub) return `error: durable object stub unavailable`;
    return 'ok';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `error: ${msg}`;
  }
}

async function handleStatus(env: Env): Promise<Response> {
  const [kv, fpl, durableObject] = await Promise.all([
    checkKv(env),
    checkFpl(env),
    checkDurableObject(env),
  ]);

  const body: StatusResponse = {
    worker: 'ok',
    kv,
    fpl,
    durable_object: durableObject,
    version: env.GIT_SHA ?? 'unknown',
    timestamp: new Date().toISOString(),
  };

  const anyDown =
    kv.startsWith('error') ||
    durableObject.startsWith('error') ||
    fpl === 'down' ||
    fpl.startsWith('error');

  return new Response(JSON.stringify(body, null, 2), {
    status: anyDown ? 503 : 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const clientIp =
      request.headers.get('CF-Connecting-IP') ??
      request.headers.get('X-Forwarded-For') ??
      '0.0.0.0';

    const cohortMatch = url.pathname.match(/^\/cohorts\/gw(\d+)\/aggregates\.json$/);
    if (cohortMatch && cohortMatch[1] && (request.method === 'GET' || request.method === 'HEAD')) {
      return handleCohortAggregates(env, Number(cohortMatch[1]), request.method);
    }

    if (
      request.method === 'POST' &&
      (url.pathname === '/notify/dispatch' || url.pathname === '/notify/dispatch/')
    ) {
      const secret = request.headers.get('X-Dispatch-Secret');
      if (!env.NOTIFY_DISPATCH_SECRET || secret !== env.NOTIFY_DISPATCH_SECRET) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      if (!body || typeof body !== 'object') {
        return new Response(JSON.stringify({ error: 'Invalid body' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      const b = body as Record<string, unknown>;
      const event = b['event'];
      const userIds = Array.isArray(b['user_ids']) ? (b['user_ids'] as string[]) : undefined;
      const payload = b['payload'];
      if (typeof event !== 'string' || !payload || typeof payload !== 'object') {
        return new Response(JSON.stringify({ error: 'Missing event or payload' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      const result = await dispatchNotification(env, {
        event: event as Parameters<typeof dispatchNotification>[1]['event'],
        ...(userIds !== undefined ? { userIds } : {}),
        payload: payload as Parameters<typeof dispatchNotification>[1]['payload'],
      });
      return new Response(JSON.stringify(result), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Route: /status → health check (uptime monitor target)
    if (url.pathname === '/status' || url.pathname === '/status/') {
      const rlStatus = await enforceRateLimit(env, clientIp, STATUS_RATE_LIMIT);
      if (rlStatus) return rlStatus;
      return handleStatus(env);
    }

    // Route: /live/ws?gw=N → LiveGwDO WebSocket
    // ?replay=<id>&speed=<n> reuses the same route but isolates state in a separate DO.
    if (url.pathname === '/live/ws' || url.pathname === '/live/ws/') {
      const gw = url.searchParams.get('gw');
      if (!gw || !/^\d+$/.test(gw)) {
        return new Response(JSON.stringify({ error: 'Missing or invalid ?gw=' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      const replay = url.searchParams.get('replay');
      const speed = url.searchParams.get('speed') ?? '1';
      const doName = replay ? `replay:${replay}:${gw}:${speed}` : `gw:${gw}`;
      const id = env.LIVE_GW.idFromName(doName);
      const stub = env.LIVE_GW.get(id);
      return stub.fetch(request);
    }

    // Route: /kits/* → FPL kit image proxy
    if (url.pathname.startsWith('/kits/')) {
      return handleKit(ctx, url.pathname);
    }

    if (url.pathname === '/vs/data' || url.pathname === '/vs/data/') {
      return handleVsData(env);
    }

    const screenshotMatch = url.pathname.match(
      /^\/vs\/screenshot\/([^/]+)\/([^/]+?)(?:\.jpg)?\/?$/
    );
    if (screenshotMatch && screenshotMatch[1] && screenshotMatch[2]) {
      return handleVsScreenshot(env, screenshotMatch[1], screenshotMatch[2]);
    }

    if (url.pathname === '/vs/debug-measure' || url.pathname === '/vs/debug-measure/') {
      return handleVsDebugMeasure(env, request);
    }

    if (url.pathname === '/vs/timed-fetch' || url.pathname === '/vs/timed-fetch/') {
      return handleVsTimedFetch(env, request);
    }

    const snapshotMatch = url.pathname.match(/^\/snapshot\/entry\/(\d+)\/?$/);
    if (snapshotMatch && snapshotMatch[1]) {
      const entryId = Number(snapshotMatch[1]);
      const result = await handleEntrySnapshot(env, ctx, entryId);
      return new Response(JSON.stringify(result.body), {
        status: result.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Route: /fpl/prices → slim, server-side-computed price-change predictions.
    // Returns ~5KB instead of shipping the full 200KB bootstrap to the client.
    if (url.pathname === '/fpl/prices' || url.pathname === '/fpl/prices/') {
      const result = await handlePrices(env, ctx);
      return new Response(JSON.stringify(result.body), {
        status: result.status,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'X-Cache': result.cache,
        },
      });
    }

    // Route: /fpl/bootstrap-static-slim → bootstrap projected to the fields the
    // UI renders (~16KB gzipped vs ~210KB for the raw passthrough).
    if (
      url.pathname === '/fpl/bootstrap-static-slim' ||
      url.pathname === '/fpl/bootstrap-static-slim/'
    ) {
      const result = await handleBootstrapSlim(env, ctx);
      return new Response(JSON.stringify(result.body), {
        status: result.status,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'X-Cache': result.cache,
        },
      });
    }

    // Route: /fpl/fixtures-slim[?event=N] → fixtures with the per-fixture stats
    // blob dropped (~90% smaller gzipped). Optional ?event filters to one GW.
    if (url.pathname === '/fpl/fixtures-slim' || url.pathname === '/fpl/fixtures-slim/') {
      const eventParam = url.searchParams.get('event');
      const eventId =
        eventParam !== null && /^\d+$/.test(eventParam) ? Number(eventParam) : undefined;
      const result = await handleFixturesSlim(env, ctx, eventId);
      return new Response(JSON.stringify(result.body), {
        status: result.status,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'X-Cache': result.cache,
        },
      });
    }

    // Route: /fpl/leagues/:id/summary[?page=N] → classic-league standings with
    // the new_entries block and league metadata stripped.
    const leagueSummaryMatch = url.pathname.match(/^\/fpl\/leagues\/(\d+)\/summary\/?$/);
    if (leagueSummaryMatch && leagueSummaryMatch[1]) {
      const leagueId = Number(leagueSummaryMatch[1]);
      const pageParam = url.searchParams.get('page');
      const page = pageParam !== null && /^\d+$/.test(pageParam) ? Number(pageParam) : 1;
      const result = await handleLeagueSummary(env, ctx, leagueId, page);
      return new Response(JSON.stringify(result.body), {
        status: result.status,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'X-Cache': result.cache,
        },
      });
    }

    // Route: /frank/weekly → cached AI weekly advice
    if (url.pathname === '/frank/weekly' || url.pathname === '/frank/weekly/') {
      return handleFrankWeekly(env);
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
    if (!matchFplRoute(fplPath)) {
      return new Response(JSON.stringify({ error: 'Not found', path: url.pathname }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const rlFpl = await enforceRateLimit(env, clientIp, PUBLIC_RATE_LIMIT);
    if (rlFpl) return rlFpl;

    const { upstreamUrl, cacheKey } = buildFplPassthroughTarget(FPL_ORIGIN, fplPath, url.search);
    const ttl = getTtl(fplPath);

    return fetchWithCache(env, ctx, cacheKey, upstreamUrl, ttl);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    if (event.cron === GW38_CAPTURE_CRON) {
      if (isWithinGw38CaptureWindow(event.scheduledTime)) {
        const id = env.LIVE_GW.idFromName(`gw:${GW38_CAPTURE_GW}`);
        const stub = env.LIVE_GW.get(id);
        await stub
          .fetch(`https://capture.internal/live/ws?gw=${GW38_CAPTURE_GW}&capture-tick=1`)
          .catch(() => undefined);
      }
      return;
    }
    if (event.cron === VS_COMPARISON_CRON) {
      await runComparison(env, { now: new Date(event.scheduledTime) });
      return;
    }
    if (event.cron === FRANK_WEEKLY_CRON) {
      await runFrankWeekly(env).catch(() => undefined);
      return;
    }
    if (event.cron === DEADLINE_REMINDER_CRON) {
      await runDeadlineReminder(env).catch(() => undefined);
      return;
    }
    if (event.cron === RIVALS_WARM_CRON) {
      ctx.waitUntil(runRivalsWarm(env, ctx).catch(() => undefined));
      return;
    }
    await warmPricesCache(env, ctx).catch(() => undefined);
    await runScheduled(event.scheduledTime, env, ctx);
    await runCaptainScoredCheck(env).catch(() => undefined);
  },
};
