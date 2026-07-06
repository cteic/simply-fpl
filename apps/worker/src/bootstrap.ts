import { buildSlimBootstrap } from '@simplyfpl/fpl-client';
import type { FplBootstrapStatic } from '@simplyfpl/types';

export interface BootstrapEnv {
  FPL_CACHE: KVNamespace;
  FPL_BASE_URL: string;
}

export interface BootstrapSlimResult {
  status: number;
  body: FplBootstrapStatic | { error: string };
  cache: 'HIT' | 'MISS';
}

export const BOOTSTRAP_CACHE_KEY = 'fpl:/bootstrap-static/';
export const BOOTSTRAP_TTL_SECONDS = 3600;
export const BOOTSTRAP_SLIM_CACHE_KEY = 'bootstrap:slim';
export const BOOTSTRAP_SLIM_TTL_SECONDS = 3600;

function isBootstrap(value: unknown): value is FplBootstrapStatic {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as FplBootstrapStatic).elements) &&
    Array.isArray((value as FplBootstrapStatic).teams)
  );
}

async function readFullBootstrap(env: BootstrapEnv): Promise<FplBootstrapStatic | null> {
  const cached = await env.FPL_CACHE.get(BOOTSTRAP_CACHE_KEY, 'text');
  if (cached === null) return null;
  try {
    const parsed = JSON.parse(cached) as unknown;
    return isBootstrap(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function fetchFullBootstrap(
  env: BootstrapEnv,
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
    return isBootstrap(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function handleBootstrapSlim(
  env: BootstrapEnv,
  ctx: ExecutionContext
): Promise<BootstrapSlimResult> {
  const cachedSlim = await env.FPL_CACHE.get(BOOTSTRAP_SLIM_CACHE_KEY, 'text');
  if (cachedSlim !== null) {
    try {
      const parsed = JSON.parse(cachedSlim) as FplBootstrapStatic;
      return { status: 200, body: parsed, cache: 'HIT' };
    } catch {
      // fall through and recompute
    }
  }

  let bootstrap = await readFullBootstrap(env);
  if (!bootstrap) {
    bootstrap = await fetchFullBootstrap(env, ctx);
  }
  if (!bootstrap) {
    return { status: 502, body: { error: 'bootstrap fetch failed' }, cache: 'MISS' };
  }

  const slim = buildSlimBootstrap(bootstrap);
  ctx.waitUntil(
    env.FPL_CACHE.put(BOOTSTRAP_SLIM_CACHE_KEY, JSON.stringify(slim), {
      expirationTtl: BOOTSTRAP_SLIM_TTL_SECONDS,
    }).catch(() => undefined)
  );
  return { status: 200, body: slim, cache: 'MISS' };
}

export async function warmBootstrapSlim(
  env: BootstrapEnv,
  bootstrap: FplBootstrapStatic
): Promise<void> {
  const slim = buildSlimBootstrap(bootstrap);
  await env.FPL_CACHE.put(BOOTSTRAP_SLIM_CACHE_KEY, JSON.stringify(slim), {
    expirationTtl: BOOTSTRAP_SLIM_TTL_SECONDS,
  }).catch(() => undefined);
}
