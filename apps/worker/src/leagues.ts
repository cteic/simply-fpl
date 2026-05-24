import { buildSlimLeague } from '@simplyfpl/fpl-client';
import type { FplLeague } from '@simplyfpl/types';

export interface LeaguesEnv {
  FPL_CACHE: KVNamespace;
  FPL_BASE_URL: string;
}

export interface LeagueSummaryResult {
  status: number;
  body: FplLeague | { error: string };
  cache: 'HIT' | 'MISS';
}

export const LEAGUE_SUMMARY_TTL_SECONDS = 90;

export function leagueSummaryCacheKey(leagueId: number, page: number): string {
  return `league:summary:${leagueId}:${page}`;
}

function isRawLeague(value: unknown): value is FplLeague {
  if (typeof value !== 'object' || value === null) return false;
  const league = value as FplLeague;
  return (
    typeof league.league === 'object' &&
    league.league !== null &&
    typeof league.standings === 'object' &&
    league.standings !== null &&
    Array.isArray(league.standings.results)
  );
}

export async function handleLeagueSummary(
  env: LeaguesEnv,
  ctx: ExecutionContext,
  leagueId: number,
  page = 1
): Promise<LeagueSummaryResult> {
  const cacheKey = leagueSummaryCacheKey(leagueId, page);
  const cached = await env.FPL_CACHE.get(cacheKey, 'text');
  if (cached !== null) {
    try {
      return { status: 200, body: JSON.parse(cached) as FplLeague, cache: 'HIT' };
    } catch {
      // fall through and recompute
    }
  }

  const upstreamUrl = `${env.FPL_BASE_URL}/leagues-classic/${leagueId}/standings/?page_standings=${page}`;
  const upstream = await fetch(upstreamUrl, {
    headers: { 'User-Agent': 'SimplyFPL/1.0', Accept: 'application/json' },
  });
  if (!upstream.ok) {
    return {
      status: upstream.status,
      body: { error: 'league fetch failed' },
      cache: 'MISS',
    };
  }

  let raw: unknown;
  try {
    raw = (await upstream.json()) as unknown;
  } catch {
    return { status: 502, body: { error: 'league parse failed' }, cache: 'MISS' };
  }
  if (!isRawLeague(raw)) {
    return { status: 502, body: { error: 'league shape invalid' }, cache: 'MISS' };
  }

  const slim = buildSlimLeague(raw);
  ctx.waitUntil(
    env.FPL_CACHE.put(cacheKey, JSON.stringify(slim), {
      expirationTtl: LEAGUE_SUMMARY_TTL_SECONDS,
    }).catch(() => undefined)
  );
  return { status: 200, body: slim, cache: 'MISS' };
}
