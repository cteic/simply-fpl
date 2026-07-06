import type { FplBootstrapStatic, FplLeague, FplLeagueStanding } from '@simplyfpl/types';

import type { Env } from '../index';
import { buildDeepLink } from './deep-links';
import { dispatchNotification } from './dispatch';

const RANK_STORE_TTL_S = 86400 * 7;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface AlertSubRow {
  user_id: string;
  league_id: number;
  top_n: number | null;
  swing_n: number | null;
}

interface StoredLeagueRank {
  rank: number;
  notifiedTopN: boolean;
}

function isBootstrap(v: unknown): v is FplBootstrapStatic {
  return !!v && typeof v === 'object' && Array.isArray((v as FplBootstrapStatic).events);
}

function isFplLeague(v: unknown): v is FplLeague {
  return !!v && typeof v === 'object' && !!(v as FplLeague).league && !!(v as FplLeague).standings;
}

function isStoredRank(v: unknown): v is StoredLeagueRank {
  return !!v && typeof v === 'object' && typeof (v as StoredLeagueRank).rank === 'number';
}

async function readKvJson<T>(
  cache: KVNamespace,
  key: string,
  guard: (v: unknown) => v is T
): Promise<T | null> {
  const raw = await cache.get(key, 'text');
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function fetchAlertSubs(env: Env): Promise<AlertSubRow[]> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) return [];

  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
  };

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/league_rank_alert_subs?select=user_id,league_id,top_n,swing_n`,
    { headers }
  );
  if (!res.ok) return [];

  return res.json();
}

async function fetchProEntryIds(env: Env, userIds: string[]): Promise<Map<string, number>> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE || userIds.length === 0) return new Map();

  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
  };

  const ids = userIds.join(',');
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/profiles?select=id,fpl_entry_id,tier&id=in.(${ids})&tier=in.(pro,ultimate)`,
    { headers }
  );
  if (!res.ok) return new Map();

  const profiles: Array<{ id: string; fpl_entry_id: number | null }> = await res.json();
  const result = new Map<string, number>();
  for (const p of profiles) {
    if (p.fpl_entry_id !== null) result.set(p.id, p.fpl_entry_id);
  }
  return result;
}

async function fetchUserQuietHours(
  env: Env,
  userId: string
): Promise<{ start: number | null; end: number | null }> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) return { start: null, end: null };

  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
  };

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/notification_prefs?select=quiet_hours_start,quiet_hours_end&user_id=eq.${userId}`,
    { headers }
  );
  if (!res.ok) return { start: null, end: null };

  const rows: Array<{ quiet_hours_start: number | null; quiet_hours_end: number | null }> =
    await res.json();
  const row = rows[0];
  return { start: row?.quiet_hours_start ?? null, end: row?.quiet_hours_end ?? null };
}

function isInQuietHours(utcHour: number, start: number | null, end: number | null): boolean {
  if (start === null || end === null) return false;
  if (start <= end) return utcHour >= start && utcHour < end;
  return utcHour >= start || utcHour < end;
}

export function evaluateLeagueRankAlert(
  sub: Pick<AlertSubRow, 'top_n' | 'swing_n'>,
  currentRank: number,
  stored: StoredLeagueRank | null
): { shouldAlert: boolean; reason: string; notifiedTopN: boolean } {
  if (!stored) {
    if (sub.top_n !== null && currentRank <= sub.top_n) {
      return {
        shouldAlert: true,
        reason: `entered top ${sub.top_n}`,
        notifiedTopN: true,
      };
    }
    return { shouldAlert: false, reason: 'first tick baseline', notifiedTopN: false };
  }

  const prevRank = stored.rank;
  const wasInTopN = stored.notifiedTopN;

  if (sub.top_n !== null) {
    const nowInTopN = currentRank <= sub.top_n;
    if (nowInTopN && !wasInTopN) {
      return { shouldAlert: true, reason: `entered top ${sub.top_n}`, notifiedTopN: true };
    }
    if (!nowInTopN && wasInTopN) {
      return { shouldAlert: true, reason: `left top ${sub.top_n}`, notifiedTopN: false };
    }
  }

  if (sub.swing_n !== null) {
    const swing = Math.abs(currentRank - prevRank);
    if (swing >= sub.swing_n) {
      const direction = currentRank < prevRank ? 'up' : 'down';
      return {
        shouldAlert: true,
        reason: `rank moved ${swing} places ${direction}`,
        notifiedTopN: stored.notifiedTopN,
      };
    }
  }

  return { shouldAlert: false, reason: 'no threshold met', notifiedTopN: wasInTopN };
}

function findStanding(standings: FplLeagueStanding[], entryId: number): FplLeagueStanding | null {
  return standings.find((s) => s.entry === entryId) ?? null;
}

export async function runLeagueRankAlertCheck(env: Env): Promise<void> {
  const bootstrap = await readKvJson(env.FPL_CACHE, 'fpl:/bootstrap-static/', isBootstrap);
  if (!bootstrap) return;

  const currentEvent = bootstrap.events.find((e) => e.is_current);
  if (!currentEvent) return;

  const subs = await fetchAlertSubs(env);
  if (subs.length === 0) return;

  const uniqueUserIds = [...new Set(subs.map((s) => s.user_id))].filter((id) => UUID_RE.test(id));
  const entryIdByUser = await fetchProEntryIds(env, uniqueUserIds);
  if (entryIdByUser.size === 0) return;

  const uniqueLeagueIds = [...new Set(subs.map((s) => s.league_id))];
  const leagueStandingsCache = new Map<number, FplLeague | null>();

  for (const leagueId of uniqueLeagueIds) {
    const key = `fpl:/leagues-classic/${leagueId}/standings/`;
    const data = await readKvJson(env.FPL_CACHE, key, isFplLeague);
    leagueStandingsCache.set(leagueId, data);
  }

  const nowUtcHour = new Date().getUTCHours();

  for (const sub of subs) {
    if (!UUID_RE.test(sub.user_id)) continue;

    const entryId = entryIdByUser.get(sub.user_id);
    if (entryId === undefined) continue;

    const leagueData = leagueStandingsCache.get(sub.league_id);
    if (!leagueData) continue;

    const standing = findStanding(leagueData.standings.results, entryId);
    if (!standing) continue;

    const currentRank = standing.rank;
    const rankKey = `notify:lrank:${sub.user_id}:${sub.league_id}:gw${currentEvent.id}`;
    const stored = await readKvJson(env.FPL_CACHE, rankKey, isStoredRank);

    const { shouldAlert, reason, notifiedTopN } = evaluateLeagueRankAlert(sub, currentRank, stored);

    const newStored: StoredLeagueRank = { rank: currentRank, notifiedTopN };
    await env.FPL_CACHE.put(rankKey, JSON.stringify(newStored), {
      expirationTtl: RANK_STORE_TTL_S,
    });

    if (!shouldAlert) continue;

    const quietHours = await fetchUserQuietHours(env, sub.user_id);
    if (isInQuietHours(nowUtcHour, quietHours.start, quietHours.end)) continue;

    const leagueName = leagueData.league.name;
    let body: string;
    if (reason.startsWith('entered')) {
      body = `You're now rank ${currentRank} in ${leagueName}.`;
    } else if (reason.startsWith('left')) {
      body = `You've dropped to rank ${currentRank} in ${leagueName}.`;
    } else {
      body = `${reason} in ${leagueName}. Now rank ${currentRank}.`;
    }

    await dispatchNotification(env, {
      event: 'rank_swing',
      userIds: [sub.user_id],
      payload: {
        type: 'rank_swing',
        title: `League rank update`,
        body,
        url: buildDeepLink('rank_swing', { entryId: String(entryId) }),
        tag: `league-rank:${sub.user_id}:${sub.league_id}:gw${currentEvent.id}`,
      },
    });
  }
}
