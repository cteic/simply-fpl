import { predictPriceChanges } from '@simplyfpl/fpl-client';
import type { FplBootstrapStatic, FplFixture } from '@simplyfpl/types';

import { warmBootstrapSlim } from './bootstrap';
import { warmFixturesSlim } from './fixtures';

export interface PricesEnv {
  FPL_CACHE: KVNamespace;
  FPL_BASE_URL: string;
}

export interface SlimPriceChange {
  id: number;
  web_name: string;
  element_type: number;
  team_name: string;
  now_cost: number;
  ownership: number;
  direction: 'rise' | 'fall';
  probability: number;
}

export interface SlimPricesResponse {
  generated_at: string;
  changes: SlimPriceChange[];
}

export interface PricesResult {
  status: number;
  body: SlimPricesResponse | { error: string };
  cache: 'HIT' | 'MISS';
}

export const PRICES_SLIM_CACHE_KEY = 'prices:slim';
export const PRICES_SLIM_TTL_SECONDS = 600;
export const BOOTSTRAP_CACHE_KEY = 'fpl:/bootstrap-static/';
export const BOOTSTRAP_TTL_SECONDS = 3600;
export const FIXTURES_CACHE_KEY = 'fpl:/fixtures/';
export const FIXTURES_TTL_SECONDS = 600;

async function readBootstrap(env: PricesEnv): Promise<FplBootstrapStatic | null> {
  const cached = await env.FPL_CACHE.get(BOOTSTRAP_CACHE_KEY, 'text');
  if (cached === null) return null;
  try {
    const parsed = JSON.parse(cached) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as FplBootstrapStatic).elements) &&
      Array.isArray((parsed as FplBootstrapStatic).teams)
    ) {
      return parsed as FplBootstrapStatic;
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchBootstrapUpstream(
  env: PricesEnv,
  ctx: ExecutionContext
): Promise<FplBootstrapStatic | null> {
  const upstream = await fetch(`${env.FPL_BASE_URL}/bootstrap-static/`, {
    headers: { 'User-Agent': 'SimplyFPL/1.0', Accept: 'application/json' },
  });
  if (!upstream.ok) return null;
  const text = await upstream.text();
  ctx.waitUntil(
    env.FPL_CACHE.put(BOOTSTRAP_CACHE_KEY, text, {
      expirationTtl: BOOTSTRAP_TTL_SECONDS,
    }).catch(() => undefined)
  );
  try {
    const parsed = JSON.parse(text) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as FplBootstrapStatic).elements) &&
      Array.isArray((parsed as FplBootstrapStatic).teams)
    ) {
      return parsed as FplBootstrapStatic;
    }
    return null;
  } catch {
    return null;
  }
}

export function buildSlimPrices(bootstrap: FplBootstrapStatic): SlimPricesResponse {
  const teamNameById = new Map(bootstrap.teams.map((t) => [t.id, t.name]));
  const changes = predictPriceChanges(bootstrap).map<SlimPriceChange>((change) => ({
    id: change.player.id,
    web_name: change.player.web_name,
    element_type: change.player.element_type,
    team_name: teamNameById.get(change.player.team) ?? change.team.name,
    now_cost: change.player.now_cost,
    ownership: parseFloat(change.player.selected_by_percent) || 0,
    direction: change.direction === 'fall' ? 'fall' : 'rise',
    probability: change.probability,
  }));
  return {
    generated_at: new Date().toISOString(),
    changes,
  };
}

export async function handlePrices(env: PricesEnv, ctx: ExecutionContext): Promise<PricesResult> {
  const cachedSlim = await env.FPL_CACHE.get(PRICES_SLIM_CACHE_KEY, 'text');
  if (cachedSlim !== null) {
    try {
      const parsed = JSON.parse(cachedSlim) as SlimPricesResponse;
      return { status: 200, body: parsed, cache: 'HIT' };
    } catch {
      // fall through and recompute
    }
  }

  let bootstrap = await readBootstrap(env);
  if (!bootstrap) {
    bootstrap = await fetchBootstrapUpstream(env, ctx);
  }
  if (!bootstrap) {
    return { status: 502, body: { error: 'bootstrap fetch failed' }, cache: 'MISS' };
  }

  const slim = buildSlimPrices(bootstrap);
  const body = JSON.stringify(slim);
  ctx.waitUntil(
    env.FPL_CACHE.put(PRICES_SLIM_CACHE_KEY, body, {
      expirationTtl: PRICES_SLIM_TTL_SECONDS,
    }).catch(() => undefined)
  );
  return { status: 200, body: slim, cache: 'MISS' };
}

export async function warmPricesCache(env: PricesEnv, ctx: ExecutionContext): Promise<void> {
  const bootstrapRes = await fetch(`${env.FPL_BASE_URL}/bootstrap-static/`, {
    headers: { 'User-Agent': 'SimplyFPL/1.0 (warm)', Accept: 'application/json' },
  }).catch(() => null);

  let bootstrap: FplBootstrapStatic | null = null;
  if (bootstrapRes && bootstrapRes.ok) {
    const text = await bootstrapRes.text();
    await env.FPL_CACHE.put(BOOTSTRAP_CACHE_KEY, text, {
      expirationTtl: BOOTSTRAP_TTL_SECONDS,
    }).catch(() => undefined);
    try {
      const parsed = JSON.parse(text) as unknown;
      if (
        parsed &&
        typeof parsed === 'object' &&
        Array.isArray((parsed as FplBootstrapStatic).elements) &&
        Array.isArray((parsed as FplBootstrapStatic).teams)
      ) {
        bootstrap = parsed as FplBootstrapStatic;
      }
    } catch {
      bootstrap = null;
    }
  }

  const fixturesRes = await fetch(`${env.FPL_BASE_URL}/fixtures/`, {
    headers: { 'User-Agent': 'SimplyFPL/1.0 (warm)', Accept: 'application/json' },
  }).catch(() => null);
  if (fixturesRes && fixturesRes.ok) {
    const fixturesText = await fixturesRes.text();
    ctx.waitUntil(
      env.FPL_CACHE.put(FIXTURES_CACHE_KEY, fixturesText, {
        expirationTtl: FIXTURES_TTL_SECONDS,
      }).catch(() => undefined)
    );
    try {
      const parsedFixtures = JSON.parse(fixturesText) as unknown;
      if (Array.isArray(parsedFixtures)) {
        ctx.waitUntil(warmFixturesSlim(env, parsedFixtures as FplFixture[]));
      }
    } catch {
      // fall through and recompute
    }
  }

  if (!bootstrap) return;

  ctx.waitUntil(warmBootstrapSlim(env, bootstrap));

  const slim = buildSlimPrices(bootstrap);
  await env.FPL_CACHE.put(PRICES_SLIM_CACHE_KEY, JSON.stringify(slim), {
    expirationTtl: PRICES_SLIM_TTL_SECONDS,
  }).catch(() => undefined);
}
