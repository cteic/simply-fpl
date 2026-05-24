import { buildSlimFixtures } from '@simplyfpl/fpl-client';
import type { FplFixture } from '@simplyfpl/types';

export interface FixturesEnv {
  FPL_CACHE: KVNamespace;
  FPL_BASE_URL: string;
}

export interface FixturesSlimResult {
  status: number;
  body: FplFixture[] | { error: string };
  cache: 'HIT' | 'MISS';
}

export const FIXTURES_CACHE_KEY = 'fpl:/fixtures/';
export const FIXTURES_TTL_SECONDS = 600;
export const FIXTURES_SLIM_CACHE_KEY = 'fixtures:slim';
export const FIXTURES_SLIM_TTL_SECONDS = 600;

function parseFixtures(text: string): FplFixture[] | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    return Array.isArray(parsed) ? (parsed as FplFixture[]) : null;
  } catch {
    return null;
  }
}

async function readFullFixtures(env: FixturesEnv): Promise<FplFixture[] | null> {
  const cached = await env.FPL_CACHE.get(FIXTURES_CACHE_KEY, 'text');
  if (cached === null) return null;
  return parseFixtures(cached);
}

async function fetchFullFixtures(
  env: FixturesEnv,
  ctx: ExecutionContext
): Promise<FplFixture[] | null> {
  const upstream = await fetch(`${env.FPL_BASE_URL}/fixtures/`, {
    headers: { 'User-Agent': 'SimplyFPL/1.0', Accept: 'application/json' },
  });
  if (!upstream.ok) return null;
  const text = await upstream.text();
  ctx.waitUntil(
    env.FPL_CACHE.put(FIXTURES_CACHE_KEY, text, {
      expirationTtl: FIXTURES_TTL_SECONDS,
    }).catch(() => undefined)
  );
  return parseFixtures(text);
}

export async function handleFixturesSlim(
  env: FixturesEnv,
  ctx: ExecutionContext,
  eventId?: number
): Promise<FixturesSlimResult> {
  let slim: FplFixture[] | null = null;
  let cache: 'HIT' | 'MISS' = 'HIT';

  const cachedSlim = await env.FPL_CACHE.get(FIXTURES_SLIM_CACHE_KEY, 'text');
  if (cachedSlim !== null) {
    slim = parseFixtures(cachedSlim);
  }

  if (!slim) {
    cache = 'MISS';
    let full = await readFullFixtures(env);
    if (!full) {
      full = await fetchFullFixtures(env, ctx);
    }
    if (!full) {
      return { status: 502, body: { error: 'fixtures fetch failed' }, cache: 'MISS' };
    }
    slim = buildSlimFixtures(full);
    const body = JSON.stringify(slim);
    ctx.waitUntil(
      env.FPL_CACHE.put(FIXTURES_SLIM_CACHE_KEY, body, {
        expirationTtl: FIXTURES_SLIM_TTL_SECONDS,
      }).catch(() => undefined)
    );
  }

  const body = eventId === undefined ? slim : slim.filter((f) => f.event === eventId);
  return { status: 200, body, cache };
}

export async function warmFixturesSlim(env: FixturesEnv, fixtures: FplFixture[]): Promise<void> {
  const slim = buildSlimFixtures(fixtures);
  await env.FPL_CACHE.put(FIXTURES_SLIM_CACHE_KEY, JSON.stringify(slim), {
    expirationTtl: FIXTURES_SLIM_TTL_SECONDS,
  }).catch(() => undefined);
}
