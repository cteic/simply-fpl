import { isValidIsoWeekKey } from './iso-week';
import { type MeasureEnv, measure } from './measure';
import { type VsEnv } from './scheduled';

export type { VsEnv };
export { handleVsTimedFetch } from './timed-fetch';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const CACHE_CONTROL = 'public, max-age=3600';

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

export async function handleVsData(env: VsEnv): Promise<Response> {
  const obj = await env.VS_BUCKET.get('vs/comparison.json');
  if (!obj) {
    return new Response(JSON.stringify({ error: 'no comparison data yet' }), {
      status: 404,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
  const body = await obj.text();
  return new Response(body, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'Cache-Control': CACHE_CONTROL,
    },
  });
}

export async function handleVsScreenshot(
  env: VsEnv,
  week: string,
  slug: string
): Promise<Response> {
  if (!isValidIsoWeekKey(week) || !SLUG_PATTERN.test(slug)) {
    return new Response(JSON.stringify({ error: 'invalid week or slug' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
  const obj = await env.VS_BUCKET.get(`vs/${week}/${slug}.jpg`);
  if (!obj) {
    return new Response(JSON.stringify({ error: 'screenshot not found' }), {
      status: 404,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
  return new Response(obj.body, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'image/jpeg',
      'Cache-Control': CACHE_CONTROL,
    },
  });
}

export interface DebugMeasureEnv extends MeasureEnv {
  VS_DEBUG_TOKEN?: string;
}

const MEASURE_ALLOWED_HOSTNAMES = new Set(['simplyfpl.com', 'livefpl.net']);

function debugAllowed(env: DebugMeasureEnv, request: Request): boolean {
  const expected = env.VS_DEBUG_TOKEN;
  if (!expected) return false;
  return request.headers.get('x-vs-debug') === expected;
}

export async function handleVsDebugMeasure(
  env: DebugMeasureEnv,
  request: Request
): Promise<Response> {
  if (!debugAllowed(env, request)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
  const url = new URL(request.url);
  const target = url.searchParams.get('url');
  const selector = url.searchParams.get('selector') ?? 'body';
  if (!target) {
    return new Response(JSON.stringify({ error: 'missing ?url=' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
  let parsedTarget: URL;
  try {
    parsedTarget = new URL(target);
  } catch {
    return new Response(JSON.stringify({ error: 'invalid ?url=' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
  if (parsedTarget.protocol !== 'https:' || !MEASURE_ALLOWED_HOSTNAMES.has(parsedTarget.hostname)) {
    return new Response(JSON.stringify({ error: 'url not allowed' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
  try {
    const result = await measure(env, { url: target, selector });
    const { screenshotBytes, ...rest } = result;
    return new Response(
      JSON.stringify({ ...rest, screenshotBytes: screenshotBytes.byteLength }, null, 2),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
