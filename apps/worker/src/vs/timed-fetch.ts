export interface TimedFetchResult {
  target: string;
  url: string;
  durationMs: number;
  statusCode: number;
  bytesReceived: number;
  timedAt: string;
}

export interface KvStore {
  get(key: string, type: 'json'): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface TimedFetchEnv {
  FPL_CACHE: KvStore;
}

export interface TargetFetchResult {
  status: number;
  body: ArrayBuffer;
}

export interface TargetFetcher {
  fetch(url: string): Promise<TargetFetchResult>;
}

const VALID_TARGETS = {
  simplyfpl: 'https://simplyfpl.com/',
  livefpl: 'https://livefpl.net/',
} as const;

type TargetKey = keyof typeof VALID_TARGETS;

const RATE_LIMIT = 30;
const RATE_WINDOW_SECS = 60;
const RATE_KEY_PREFIX = 'vs:rl:';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function isTargetKey(value: string): value is TargetKey {
  return value === 'simplyfpl' || value === 'livefpl';
}

interface RateLimitRecord {
  count: number;
  windowStart: number;
}

function isRateLimitRecord(value: unknown): value is RateLimitRecord {
  if (typeof value !== 'object' || value === null) return false;
  const rec = value as Record<string, unknown>;
  return typeof rec.count === 'number' && typeof rec.windowStart === 'number';
}

async function checkRateLimit(
  kv: KvStore,
  ip: string,
  now: number
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const key = `${RATE_KEY_PREFIX}${ip}`;
  const existing = await kv.get(key, 'json');

  if (!isRateLimitRecord(existing)) {
    await kv.put(key, JSON.stringify({ count: 1, windowStart: now }), {
      expirationTtl: RATE_WINDOW_SECS,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= RATE_LIMIT) {
    const elapsed = (now - existing.windowStart) / 1000;
    const retryAfterSeconds = Math.max(1, Math.ceil(RATE_WINDOW_SECS - elapsed));
    return { allowed: false, retryAfterSeconds };
  }

  await kv.put(
    key,
    JSON.stringify({ count: existing.count + 1, windowStart: existing.windowStart }),
    { expirationTtl: RATE_WINDOW_SECS }
  );
  return { allowed: true, retryAfterSeconds: 0 };
}

export const defaultTargetFetcher: TargetFetcher = {
  fetch: async (url: string) => {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SimplyFPL-SpeedTest/1.0' },
      redirect: 'follow',
    });
    const body = await res.arrayBuffer();
    return { status: res.status, body };
  },
};

export async function handleVsTimedFetch(
  env: TimedFetchEnv,
  request: Request,
  fetcher: TargetFetcher = defaultTargetFetcher
): Promise<Response> {
  const reqUrl = new URL(request.url);
  const target = reqUrl.searchParams.get('target');

  if (!target || !isTargetKey(target)) {
    return new Response(JSON.stringify({ error: 'invalid ?target= — use simplyfpl or livefpl' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const ip =
    request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Forwarded-For') ?? '0.0.0.0';
  const now = Date.now();

  const rateCheck = await checkRateLimit(env.FPL_CACHE, ip, now);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ error: 'rate_limited', retryAfterSeconds: rateCheck.retryAfterSeconds }),
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'Retry-After': String(rateCheck.retryAfterSeconds),
        },
      }
    );
  }

  const targetUrl = VALID_TARGETS[target];
  const start = Date.now();

  let statusCode: number;
  let bytesReceived: number;
  let durationMs: number;

  try {
    const fetched = await fetcher.fetch(targetUrl);
    durationMs = Date.now() - start;
    statusCode = fetched.status;
    bytesReceived = fetched.body.byteLength;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: 'fetch_failed', message }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const result: TimedFetchResult = {
    target,
    url: targetUrl,
    durationMs,
    statusCode,
    bytesReceived,
    timedAt: new Date(now).toISOString(),
  };

  return new Response(JSON.stringify(result), {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
