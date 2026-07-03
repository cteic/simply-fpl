import type { FplBootstrapStatic, FplEntryGameweekPicks, FplLiveGameweek } from '@simplyfpl/types';

import type { Env } from '../index';
import { buildDeepLink } from './deep-links';
import { dispatchNotification } from './dispatch';

const STATS_DEDUP_TTL_S = 86400 * 2;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STARTING_XI_MAX_POSITION = 11;

interface StoredElementStats {
  goals: number;
  assists: number;
  red_cards: number;
}

interface ElementNewEvents {
  elementId: number;
  playerName: string;
  isCaptain: boolean;
  captainMultiplier: number;
  newGoals: number;
  newAssists: number;
  redCard: boolean;
  livePoints: number;
}

interface ProUserWithEntry {
  user_id: string;
  fpl_entry_id: number;
}

function isBootstrap(v: unknown): v is FplBootstrapStatic {
  return !!v && typeof v === 'object' && Array.isArray((v as FplBootstrapStatic).events);
}

function isLiveGw(v: unknown): v is FplLiveGameweek {
  return !!v && typeof v === 'object' && Array.isArray((v as FplLiveGameweek).elements);
}

function isEntryPicks(v: unknown): v is FplEntryGameweekPicks {
  return !!v && typeof v === 'object' && Array.isArray((v as FplEntryGameweekPicks).picks);
}

function isStoredStats(v: unknown): v is Record<string, StoredElementStats> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
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

async function fetchProUsersWithPlayerEventPref(env: Env): Promise<ProUserWithEntry[]> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) return [];

  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
  };

  const prefsRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/notification_prefs?select=user_id&or=(goal_scored.eq.true,assist.eq.true,red_card.eq.true)`,
    { headers }
  );
  if (!prefsRes.ok) return [];

  const prefs: Array<{ user_id: string }> = await prefsRes.json();
  if (prefs.length === 0) return [];

  const ids = prefs.map((p) => p.user_id).join(',');
  const profilesRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/profiles?select=id,fpl_entry_id,tier&id=in.(${ids})&tier=in.(pro,ultimate)`,
    { headers }
  );
  if (!profilesRes.ok) return [];

  const profiles: Array<{ id: string; fpl_entry_id: number | null; tier: string }> =
    await profilesRes.json();

  return profiles
    .filter((p) => p.fpl_entry_id !== null)
    .map((p) => ({ user_id: p.id, fpl_entry_id: p.fpl_entry_id as number }));
}

async function fetchUserPrefs(
  env: Env,
  userId: string
): Promise<{
  goal_scored: boolean;
  assist: boolean;
  red_card: boolean;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
} | null> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) return null;

  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
  };

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/notification_prefs?select=goal_scored,assist,red_card,quiet_hours_start,quiet_hours_end&user_id=eq.${userId}`,
    { headers }
  );
  if (!res.ok) return null;

  const rows: Array<{
    goal_scored: boolean;
    assist: boolean;
    red_card: boolean;
    quiet_hours_start: number | null;
    quiet_hours_end: number | null;
  }> = await res.json();

  return rows[0] ?? null;
}

function isInQuietHours(utcHour: number, start: number | null, end: number | null): boolean {
  if (start === null || end === null) return false;
  if (start <= end) return utcHour >= start && utcHour < end;
  return utcHour >= start || utcHour < end;
}

function formatPlayerEventsBody(events: ElementNewEvents[]): string {
  const parts: string[] = [];
  for (const ev of events) {
    const prefix = ev.isCaptain ? `${ev.playerName} (C)` : ev.playerName;
    if (ev.newGoals > 0) {
      const label = ev.newGoals === 1 ? 'scored' : `scored x${ev.newGoals}`;
      const pts = ev.livePoints > 0 ? ` — ${ev.livePoints}pts` : '';
      parts.push(`${prefix} ${label}${pts}`);
    }
    if (ev.newAssists > 0) {
      const label = ev.newAssists === 1 ? 'assist' : `${ev.newAssists} assists`;
      parts.push(`${prefix} ${label}`);
    }
    if (ev.redCard) {
      parts.push(`${prefix} red card`);
    }
  }
  const body = parts.join(' · ');
  return body.length > 120 ? `${body.slice(0, 117)}...` : body;
}

function buildNotificationTitle(events: ElementNewEvents[]): string {
  if (events.length === 1) {
    const ev = events[0];
    if (!ev) return 'Squad update';
    if (ev.isCaptain && ev.newGoals > 0) return `${ev.playerName} scored (C)`;
    if (ev.newGoals > 0) return `${ev.playerName} scored`;
    if (ev.redCard) return `${ev.playerName} red card`;
    if (ev.newAssists > 0) return `${ev.playerName} assist`;
  }
  return 'Squad update';
}

export function detectElementNewEvents(
  prevStats: StoredElementStats | null,
  goals: number,
  assists: number,
  red_cards: number
): { newGoals: number; newAssists: number; redCard: boolean } {
  if (!prevStats) return { newGoals: 0, newAssists: 0, redCard: false };
  return {
    newGoals: Math.max(0, goals - prevStats.goals),
    newAssists: Math.max(0, assists - prevStats.assists),
    redCard: red_cards > prevStats.red_cards,
  };
}

export async function runPlayerEventsCheck(env: Env): Promise<void> {
  const bootstrap = await readKvJson(env.FPL_CACHE, 'fpl:/bootstrap-static/', isBootstrap);
  if (!bootstrap) return;

  const currentEvent = bootstrap.events.find((e) => e.is_current);
  if (!currentEvent || currentEvent.finished) return;

  const liveGw = await readKvJson(env.FPL_CACHE, `fpl:/event/${currentEvent.id}/live/`, isLiveGw);
  if (!liveGw) return;

  const statsKey = `notify:pstats:gw${currentEvent.id}`;
  const prevStatsMap = await readKvJson(env.FPL_CACHE, statsKey, isStoredStats);

  const liveByElement = new Map(liveGw.elements.map((el) => [el.id, el]));

  const currentStatsMap: Record<string, StoredElementStats> = {};
  for (const el of liveGw.elements) {
    currentStatsMap[String(el.id)] = {
      goals: el.stats.goals_scored,
      assists: el.stats.assists,
      red_cards: el.stats.red_cards,
    };
  }

  const elementsWithNewEvents = new Map<
    number,
    { newGoals: number; newAssists: number; redCard: boolean }
  >();

  for (const el of liveGw.elements) {
    const prev = prevStatsMap ? (prevStatsMap[String(el.id)] ?? null) : null;
    const diff = detectElementNewEvents(
      prev,
      el.stats.goals_scored,
      el.stats.assists,
      el.stats.red_cards
    );
    if (diff.newGoals > 0 || diff.newAssists > 0 || diff.redCard) {
      elementsWithNewEvents.set(el.id, diff);
    }
  }

  await env.FPL_CACHE.put(statsKey, JSON.stringify(currentStatsMap), {
    expirationTtl: STATS_DEDUP_TTL_S,
  });

  if (elementsWithNewEvents.size === 0) return;

  const users = (await fetchProUsersWithPlayerEventPref(env)).filter((u) =>
    UUID_RE.test(u.user_id)
  );
  if (users.length === 0) return;

  const nowUtcHour = new Date().getUTCHours();

  for (const user of users) {
    const prefs = await fetchUserPrefs(env, user.user_id);
    if (!prefs) continue;

    if (isInQuietHours(nowUtcHour, prefs.quiet_hours_start, prefs.quiet_hours_end)) continue;

    const picks = await readKvJson(
      env.FPL_CACHE,
      `fpl:/entry/${user.fpl_entry_id}/event/${currentEvent.id}/picks/`,
      isEntryPicks
    );
    if (!picks) continue;

    const startingXi = picks.picks.filter((p) => p.position <= STARTING_XI_MAX_POSITION);

    const userEvents: ElementNewEvents[] = [];

    for (const pick of startingXi) {
      const diff = elementsWithNewEvents.get(pick.element);
      if (!diff) continue;

      if (diff.newGoals > 0 && !prefs.goal_scored) continue;
      if (diff.newAssists > 0 && !prefs.assist && diff.newGoals === 0 && !diff.redCard) continue;
      if (diff.redCard && !prefs.red_card && diff.newGoals === 0 && diff.newAssists === 0) continue;

      const playerEl = bootstrap.elements.find((e) => e.id === pick.element);
      const playerName = playerEl ? playerEl.web_name : `Player ${pick.element}`;
      const liveEl = liveByElement.get(pick.element);
      const livePoints = liveEl ? liveEl.stats.total_points * pick.multiplier : 0;

      const filteredDiff = {
        newGoals: prefs.goal_scored ? diff.newGoals : 0,
        newAssists: prefs.assist ? diff.newAssists : 0,
        redCard: prefs.red_card ? diff.redCard : false,
      };

      if (filteredDiff.newGoals === 0 && filteredDiff.newAssists === 0 && !filteredDiff.redCard) {
        continue;
      }

      userEvents.push({
        elementId: pick.element,
        playerName,
        isCaptain: pick.is_captain,
        captainMultiplier: pick.multiplier,
        livePoints,
        ...filteredDiff,
      });
    }

    if (userEvents.length === 0) continue;

    let primaryEvent: 'goal_scored' | 'assist' | 'red_card';
    if (userEvents.find((e) => e.newGoals > 0)) {
      primaryEvent = 'goal_scored';
    } else if (userEvents.find((e) => e.newAssists > 0)) {
      primaryEvent = 'assist';
    } else {
      primaryEvent = 'red_card';
    }

    await dispatchNotification(env, {
      event: primaryEvent,
      userIds: [user.user_id],
      payload: {
        type: primaryEvent,
        title: buildNotificationTitle(userEvents),
        body: formatPlayerEventsBody(userEvents),
        url: buildDeepLink('goal_scored', { entryId: String(user.fpl_entry_id) }),
        tag: `player-events:${user.user_id}:gw${currentEvent.id}:tick${Date.now()}`,
      },
    });
  }
}
