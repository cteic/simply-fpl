export interface AskCacheEnv {
  FRANK_WEEKLY_CACHE: KVNamespace;
  FRANK_CACHE_WRITE_SECRET?: string;
}

const FRANK_ASK_CACHE_TTL_SECONDS = 24 * 60 * 60;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Frank-Cache-Secret',
};

export async function handleFrankAskCacheGet(env: AskCacheEnv, key: string): Promise<Response> {
  if (!key) {
    return new Response(JSON.stringify({ error: 'key required' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const cached = await env.FRANK_WEEKLY_CACHE.get(key, 'text');
  if (cached) {
    return new Response(cached, {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }

  return new Response(JSON.stringify({ error: 'not found' }), {
    status: 404,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
  });
}

export async function handleFrankAskCachePut(
  env: AskCacheEnv,
  key: string,
  request: Request
): Promise<Response> {
  const secret = request.headers.get('X-Frank-Cache-Secret');
  if (!env.FRANK_CACHE_WRITE_SECRET || secret !== env.FRANK_CACHE_WRITE_SECRET) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  if (!key) {
    return new Response(JSON.stringify({ error: 'key required' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  let body: string;
  try {
    body = await request.text();
    JSON.parse(body);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  await env.FRANK_WEEKLY_CACHE.put(key, body, { expirationTtl: FRANK_ASK_CACHE_TTL_SECONDS });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
