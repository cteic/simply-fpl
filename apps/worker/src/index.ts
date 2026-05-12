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
  if (pathname.includes('/live/')) return 60; // 1 minute
  if (pathname.includes('leagues-classic')) return 90; // 90 seconds
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

const FPL_CDN_ORIGIN = 'https://fantasy.premierleague.com/dist/img/shirts/standard';

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
};
