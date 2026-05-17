import type {
  FplBootstrapStatic,
  FplEntry,
  FplEntryGameweekPicks,
  FplEntrySnapshot,
} from '@simplyfpl/types';

export interface SnapshotEnv {
  FPL_CACHE: KVNamespace;
  FPL_BASE_URL: string;
}

export interface SnapshotResult {
  status: number;
  body: FplEntrySnapshot | { error: string };
}

class UpstreamError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string
  ) {
    super(`upstream ${status}: ${url}`);
  }
}

async function getCachedJson<T>(
  env: SnapshotEnv,
  ctx: ExecutionContext,
  cacheKey: string,
  upstreamUrl: string,
  ttl: number
): Promise<T> {
  const cached = await env.FPL_CACHE.get(cacheKey, 'text');
  if (cached !== null) {
    return JSON.parse(cached) as T;
  }
  const upstream = await fetch(upstreamUrl, {
    headers: { 'User-Agent': 'SimplyFPL/1.0', Accept: 'application/json' },
  });
  if (!upstream.ok) {
    throw new UpstreamError(upstream.status, upstreamUrl);
  }
  const text = await upstream.text();
  ctx.waitUntil(
    env.FPL_CACHE.put(cacheKey, text, { expirationTtl: ttl }).catch(() => undefined)
  );
  return JSON.parse(text) as T;
}

export function currentGwFromBootstrap(bootstrap: FplBootstrapStatic): number {
  const current = bootstrap.events.find((e) => e.is_current);
  if (current) return current.id;
  const next = bootstrap.events.find((e) => e.is_next);
  if (next) return next.id;
  return bootstrap.events.at(-1)?.id ?? 1;
}

export async function handleEntrySnapshot(
  env: SnapshotEnv,
  ctx: ExecutionContext,
  entryId: number
): Promise<SnapshotResult> {
  let bootstrap: FplBootstrapStatic;
  try {
    bootstrap = await getCachedJson<FplBootstrapStatic>(
      env,
      ctx,
      'fpl:/bootstrap-static/',
      `${env.FPL_BASE_URL}/bootstrap-static/`,
      3600
    );
  } catch {
    return { status: 502, body: { error: 'bootstrap fetch failed' } };
  }
  const gw = currentGwFromBootstrap(bootstrap);

  const [entryResult, picksResult] = await Promise.allSettled([
    getCachedJson<FplEntry>(
      env,
      ctx,
      `fpl:/entry/${entryId}/`,
      `${env.FPL_BASE_URL}/entry/${entryId}/`,
      300
    ),
    getCachedJson<FplEntryGameweekPicks>(
      env,
      ctx,
      `fpl:/entry/${entryId}/event/${gw}/picks/`,
      `${env.FPL_BASE_URL}/entry/${entryId}/event/${gw}/picks/`,
      120
    ),
  ]);

  if (entryResult.status === 'rejected') {
    return { status: 404, body: { error: 'entry not found' } };
  }

  const body: FplEntrySnapshot = {
    bootstrap,
    entry: entryResult.value,
    picks: picksResult.status === 'fulfilled' ? picksResult.value : null,
    gw,
  };
  return { status: 200, body };
}
