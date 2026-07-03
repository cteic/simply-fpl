import { collateTeamNews, filterNewsForPicks } from '@simplyfpl/fpl-client';
import type {
  EntryNewsResponse,
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  TeamNewsResponse,
} from '@simplyfpl/types';

export interface NewsEnv {
  FPL_CACHE: KVNamespace;
  FPL_BASE_URL: string;
}

export const NEWS_TEAMS_CACHE_KEY = 'news:teams';
export const NEWS_TEAMS_TTL_SECONDS = 1800;

export interface NewsTeamsResult {
  status: number;
  body: TeamNewsResponse | { error: string };
  cache: 'HIT' | 'MISS';
}

export interface EntryNewsResult {
  status: number;
  body: EntryNewsResponse | { error: string };
  cache: 'HIT' | 'MISS';
}

async function readBootstrap(env: NewsEnv): Promise<FplBootstrapStatic | null> {
  const cached = await env.FPL_CACHE.get('fpl:/bootstrap-static/', 'text');
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
  env: NewsEnv,
  ctx: ExecutionContext
): Promise<FplBootstrapStatic | null> {
  const res = await fetch(`${env.FPL_BASE_URL}/bootstrap-static/`, {
    headers: { 'User-Agent': 'SimplyFPL/1.0', Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const text = await res.text();
  ctx.waitUntil(
    env.FPL_CACHE.put('fpl:/bootstrap-static/', text, { expirationTtl: 3600 }).catch(
      () => undefined
    )
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

function buildTeamsResponse(bootstrap: FplBootstrapStatic): TeamNewsResponse {
  return {
    generated_at: new Date().toISOString(),
    teams: collateTeamNews(bootstrap),
  };
}

export async function handleNewsTeams(
  env: NewsEnv,
  ctx: ExecutionContext
): Promise<NewsTeamsResult> {
  const cached = await env.FPL_CACHE.get(NEWS_TEAMS_CACHE_KEY, 'text');
  if (cached !== null) {
    try {
      return { status: 200, body: JSON.parse(cached) as TeamNewsResponse, cache: 'HIT' };
    } catch {
      // fall through and recompute
    }
  }

  let bootstrap = await readBootstrap(env);
  if (!bootstrap) bootstrap = await fetchBootstrapUpstream(env, ctx);
  if (!bootstrap) {
    return { status: 502, body: { error: 'bootstrap fetch failed' }, cache: 'MISS' };
  }

  const body = buildTeamsResponse(bootstrap);
  ctx.waitUntil(
    env.FPL_CACHE.put(NEWS_TEAMS_CACHE_KEY, JSON.stringify(body), {
      expirationTtl: NEWS_TEAMS_TTL_SECONDS,
    }).catch(() => undefined)
  );
  return { status: 200, body, cache: 'MISS' };
}

async function fetchEntryPicks(
  env: NewsEnv,
  entryId: number,
  eventId: number
): Promise<FplEntryGameweekPicks | null> {
  const cacheKey = `fpl:/entry/${entryId}/event/${eventId}/picks/`;
  const cached = await env.FPL_CACHE.get(cacheKey, 'text');
  if (cached !== null) {
    try {
      return JSON.parse(cached) as FplEntryGameweekPicks;
    } catch {
      // fall through to upstream
    }
  }
  const res = await fetch(`${env.FPL_BASE_URL}/entry/${entryId}/event/${eventId}/picks/`, {
    headers: { 'User-Agent': 'SimplyFPL/1.0', Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const text = await res.text();
  try {
    return JSON.parse(text) as FplEntryGameweekPicks;
  } catch {
    return null;
  }
}

export async function handleEntryNews(
  env: NewsEnv,
  ctx: ExecutionContext,
  entryId: number
): Promise<EntryNewsResult> {
  let bootstrap = await readBootstrap(env);
  if (!bootstrap) bootstrap = await fetchBootstrapUpstream(env, ctx);
  if (!bootstrap) {
    return { status: 502, body: { error: 'bootstrap fetch failed' }, cache: 'MISS' };
  }

  const currentEvent = bootstrap.events.find((e) => e.is_current);
  if (!currentEvent) {
    return {
      status: 200,
      body: { generated_at: new Date().toISOString(), entry_id: entryId, players: [] },
      cache: 'MISS',
    };
  }

  const picks = await fetchEntryPicks(env, entryId, currentEvent.id);
  if (!picks) {
    return { status: 502, body: { error: 'entry picks fetch failed' }, cache: 'MISS' };
  }

  const playerIds = new Set(picks.picks.map((p) => p.element));
  const groups = collateTeamNews(bootstrap);
  const players = filterNewsForPicks(groups, playerIds);

  return {
    status: 200,
    body: { generated_at: new Date().toISOString(), entry_id: entryId, players },
    cache: 'MISS',
  };
}

export async function warmNewsCache(env: NewsEnv): Promise<void> {
  const bootstrap = await readBootstrap(env);
  if (!bootstrap) return;
  const body = buildTeamsResponse(bootstrap);
  await env.FPL_CACHE.put(NEWS_TEAMS_CACHE_KEY, JSON.stringify(body), {
    expirationTtl: NEWS_TEAMS_TTL_SECONDS,
  }).catch(() => undefined);
}
