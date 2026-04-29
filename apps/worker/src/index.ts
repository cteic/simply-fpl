export interface Env {
  FPL_CACHE: KVNamespace;
  FPL_BASE_URL: string;
  BOOTSTRAP_TTL: string;
  LIVE_GW_TTL: string;
  ENTRY_TTL: string;
  LEAGUE_TTL: string;
}

const FPL_ORIGIN = 'https://fantasy.premierleague.com/api';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Route → cache TTL mapping (seconds)
function getTtl(pathname: string): number {
  if (pathname.includes('bootstrap-static')) return 3600; // 1 hour
  if (pathname.includes('/live/')) return 60;             // 1 minute
  if (pathname.includes('leagues-classic')) return 90;    // 90 seconds
  if (pathname.includes('/entry/') && pathname.includes('/picks/')) return 120;
  if (pathname.includes('/entry/')) return 300;
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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
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
};
