import type { FplBootstrapStatic, FplEntryGameweekPicks } from '@simplyfpl/types';

import type { Env } from '../index';
import { buildSnapshot, detectPlayerStatusChanges } from '../news/status-diff';
import type {
  PlayerStatusChange,
  PlayerStatusSnapshot,
  StatusChangeType,
} from '../news/status-diff';
import { buildDeepLink } from './deep-links';
import { dispatchNotification } from './dispatch';

export const PAVAIL_SNAPSHOT_KEY = 'notify:pavail:snapshot';
const SNAPSHOT_TTL_S = 7 * 24 * 60 * 60;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isBootstrap(v: unknown): v is FplBootstrapStatic {
  return !!v && typeof v === 'object' && Array.isArray((v as FplBootstrapStatic).elements);
}

function isSnapshot(v: unknown): v is PlayerStatusSnapshot {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isEntryPicks(v: unknown): v is FplEntryGameweekPicks {
  return !!v && typeof v === 'object' && Array.isArray((v as FplEntryGameweekPicks).picks);
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

interface ProUserWithEntry {
  user_id: string;
  fpl_entry_id: number;
}

async function fetchProUsersWithAvailabilityPref(env: Env): Promise<ProUserWithEntry[]> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) return [];

  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
  };

  const prefsRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/notification_prefs?select=user_id&player_availability_changed=eq.true`,
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

async function fetchUserQuietHours(
  env: Env,
  userId: string
): Promise<{ quiet_hours_start: number | null; quiet_hours_end: number | null } | null> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) return null;

  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
  };

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/notification_prefs?select=quiet_hours_start,quiet_hours_end&user_id=eq.${userId}`,
    { headers }
  );
  if (!res.ok) return null;

  const rows: Array<{ quiet_hours_start: number | null; quiet_hours_end: number | null }> =
    await res.json();
  return rows[0] ?? null;
}

function isInQuietHours(utcHour: number, start: number | null, end: number | null): boolean {
  if (start === null || end === null) return false;
  if (start <= end) return utcHour >= start && utcHour < end;
  return utcHour >= start || utcHour < end;
}

function buildNotificationTitle(change: PlayerStatusChange): string {
  switch (change.changeType) {
    case 'ruled_out':
      return `${change.playerName} ruled out`;
    case 'newly_flagged':
      return `${change.playerName} flagged`;
    case 'upgraded': {
      const pct = change.chanceOfPlaying !== null ? ` (${change.chanceOfPlaying}%)` : '';
      return `${change.playerName} could feature${pct}`;
    }
  }
}

function buildNotificationBody(change: PlayerStatusChange): string {
  if (change.news) return change.news;
  switch (change.changeType) {
    case 'ruled_out':
      return 'Player unavailable for selection.';
    case 'newly_flagged':
      return 'Player flagged — check before deadine.';
    case 'upgraded':
      return 'Fitness improving — monitor before deadline.';
  }
}

function primaryChangeType(
  changes: PlayerStatusChange[]
): 'ruled_out' | 'newly_flagged' | 'upgraded' {
  const order: StatusChangeType[] = ['ruled_out', 'newly_flagged', 'upgraded'];
  for (const t of order) {
    if (changes.some((c) => c.changeType === t)) return t;
  }
  return 'newly_flagged';
}

export async function runPlayerAvailabilityCheck(env: Env): Promise<void> {
  const bootstrap = await readKvJson(env.FPL_CACHE, 'fpl:/bootstrap-static/', isBootstrap);
  if (!bootstrap) return;

  const prevSnapshot = await readKvJson(env.FPL_CACHE, PAVAIL_SNAPSHOT_KEY, isSnapshot);

  const newSnapshot = buildSnapshot(bootstrap.elements);

  await env.FPL_CACHE.put(PAVAIL_SNAPSHOT_KEY, JSON.stringify(newSnapshot), {
    expirationTtl: SNAPSHOT_TTL_S,
  }).catch(() => undefined);

  if (!prevSnapshot) return;

  const changes = detectPlayerStatusChanges(prevSnapshot, bootstrap.elements);
  if (changes.length === 0) return;

  const changedPlayerIds = new Set(changes.map((c) => c.playerId));

  const users = (await fetchProUsersWithAvailabilityPref(env)).filter((u) =>
    UUID_RE.test(u.user_id)
  );
  if (users.length === 0) return;

  const currentEvent = bootstrap.events.find((e) => e.is_current);
  const gwId = currentEvent?.id ?? 0;
  const nowUtcHour = new Date().getUTCHours();

  for (const user of users) {
    const quiet = await fetchUserQuietHours(env, user.user_id);
    if (quiet && isInQuietHours(nowUtcHour, quiet.quiet_hours_start, quiet.quiet_hours_end)) {
      continue;
    }

    const picksKey = `fpl:/entry/${user.fpl_entry_id}/event/${gwId}/picks/`;
    const picks = await readKvJson(env.FPL_CACHE, picksKey, isEntryPicks);
    if (!picks) continue;

    const squadIds = new Set(picks.picks.map((p) => p.element));
    const userChanges = changes.filter(
      (c) => squadIds.has(c.playerId) && changedPlayerIds.has(c.playerId)
    );
    if (userChanges.length === 0) continue;

    const primaryChange = userChanges[0];
    if (!primaryChange) continue;

    const dominant = primaryChangeType(userChanges);
    const title =
      userChanges.length === 1
        ? buildNotificationTitle(primaryChange)
        : `${userChanges.length} squad players flagged`;

    const body =
      userChanges.length === 1
        ? buildNotificationBody(primaryChange)
        : userChanges.map((c) => buildNotificationTitle(c)).join(' · ');

    await dispatchNotification(env, {
      event: 'player_availability_changed',
      userIds: [user.user_id],
      payload: {
        type: 'player_availability_changed',
        title,
        body: body.length > 120 ? `${body.slice(0, 117)}...` : body,
        url: buildDeepLink('player_availability_changed', {
          entryId: String(user.fpl_entry_id),
        }),
        tag: `pavail:${user.user_id}:${dominant}:${Array.from(changedPlayerIds).sort().join(',')}`,
      },
    });
  }
}
