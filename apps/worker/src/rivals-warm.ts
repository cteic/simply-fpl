import type { Env } from './index';

export const RIVALS_WARM_CRON = '0 * * * *';

const PICKS_TTL_SECONDS = 120;
const MARKER_TTL_SECONDS = 3600;
const TOP_ENTRIES_PER_LEAGUE = 50;

interface SupabaseLeagueRow {
  league_id: number;
}

async function fetchTrackedLeagueIds(env: Env): Promise<number[]> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) return [];
  const url = `${env.SUPABASE_URL}/rest/v1/user_leagues?select=league_id`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as SupabaseLeagueRow[];
  return [...new Set(rows.map((r) => r.league_id))];
}

async function fetchCurrentGw(env: Env): Promise<number | null> {
  const cached = await env.FPL_CACHE.get('fpl:/bootstrap-static/', 'text');
  const text = cached ?? (await fetchBootstrapText(env));
  if (!text) return null;
  try {
    const data = JSON.parse(text) as {
      events?: Array<{ id: number; is_current?: boolean }>;
    };
    return data.events?.find((e) => e.is_current)?.id ?? null;
  } catch {
    return null;
  }
}

async function fetchBootstrapText(env: Env): Promise<string | null> {
  const res = await fetch(`${env.FPL_BASE_URL}/bootstrap-static/`, {
    headers: { 'User-Agent': 'SimplyFPL/1.0', Accept: 'application/json' },
  });
  return res.ok ? res.text() : null;
}

async function warmLeaguePicks(env: Env, leagueId: number, gw: number): Promise<void> {
  const standingsUrl = `${env.FPL_BASE_URL}/leagues-classic/${leagueId}/standings/`;
  const standingsRes = await fetch(standingsUrl, {
    headers: { 'User-Agent': 'SimplyFPL/1.0', Accept: 'application/json' },
  });
  if (!standingsRes.ok) return;

  const raw = (await standingsRes.json()) as {
    standings?: { results?: Array<{ entry: number }> };
  };
  const entries = (raw.standings?.results ?? []).slice(0, TOP_ENTRIES_PER_LEAGUE);

  await Promise.allSettled(
    entries.map(async ({ entry }) => {
      const cacheKey = `fpl:/entry/${entry}/event/${gw}/picks/`;
      const already = await env.FPL_CACHE.get(cacheKey);
      if (already !== null) return;
      const picksRes = await fetch(`${env.FPL_BASE_URL}/entry/${entry}/event/${gw}/picks/`, {
        headers: { 'User-Agent': 'SimplyFPL/1.0', Accept: 'application/json' },
      });
      if (!picksRes.ok) return;
      const body = await picksRes.text();
      await env.FPL_CACHE.put(cacheKey, body, { expirationTtl: PICKS_TTL_SECONDS });
    })
  );

  await env.FPL_CACHE.put(`picks:warm:${gw}:${leagueId}`, new Date().toISOString(), {
    expirationTtl: MARKER_TTL_SECONDS,
  }).catch(() => undefined);
}

export async function runRivalsWarm(env: Env, ctx: ExecutionContext): Promise<void> {
  const [leagueIds, gw] = await Promise.all([fetchTrackedLeagueIds(env), fetchCurrentGw(env)]);
  if (gw === null || leagueIds.length === 0) return;
  ctx.waitUntil(Promise.allSettled(leagueIds.map((id) => warmLeaguePicks(env, id, gw))));
}
