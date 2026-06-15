import type { FplBootstrapStatic, FplEntryGameweekPicks, FplLiveGameweek } from '@simplyfpl/types';

import type { Env } from '../index';
import { buildDeepLink } from './deep-links';
import { dispatchNotification } from './dispatch';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CAPTAIN_DEDUP_TTL_S = 86400 * 2;

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

async function fetchProUsersWithCaptainPref(env: Env): Promise<ProUserWithEntry[]> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) return [];

  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
  };

  const prefsRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/notification_prefs?select=user_id&captain_scored=eq.true`,
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

export async function runCaptainScoredCheck(env: Env): Promise<void> {
  const bootstrap = await readKvJson(env.FPL_CACHE, 'fpl:/bootstrap-static/', isBootstrap);
  if (!bootstrap) return;

  const currentEvent = bootstrap.events.find((e) => e.is_current);
  if (!currentEvent || currentEvent.finished) return;

  const liveGw = await readKvJson(env.FPL_CACHE, `fpl:/event/${currentEvent.id}/live/`, isLiveGw);
  if (!liveGw) return;

  const liveByElement = new Map(liveGw.elements.map((el) => [el.id, el]));

  const users = (await fetchProUsersWithCaptainPref(env)).filter((u) => UUID_RE.test(u.user_id));
  if (users.length === 0) return;

  for (const user of users) {
    const dedupKey = `notify:captain-sent:${user.user_id}:gw${currentEvent.id}`;
    const alreadySent = await env.FPL_CACHE.get(dedupKey);
    if (alreadySent) continue;

    const picks = await readKvJson(
      env.FPL_CACHE,
      `fpl:/entry/${user.fpl_entry_id}/event/${currentEvent.id}/picks/`,
      isEntryPicks
    );
    if (!picks) continue;

    const captainPick = picks.picks.find((p) => p.is_captain);
    if (!captainPick) continue;

    const liveEl = liveByElement.get(captainPick.element);
    if (!liveEl) continue;

    const captainPoints = liveEl.stats.total_points * captainPick.multiplier;
    if (captainPoints <= 0) continue;

    const playerEl = bootstrap.elements.find((e) => e.id === captainPick.element);
    const playerName = playerEl ? playerEl.web_name : 'Your captain';

    await dispatchNotification(env, {
      event: 'captain_scored',
      userIds: [user.user_id],
      payload: {
        type: 'captain_scored',
        title: `${playerName} is scoring`,
        body: `${captainPoints} points so far this gameweek.`,
        url: buildDeepLink('captain_scored', { entryId: String(user.fpl_entry_id) }),
        tag: `captain-scored:${user.user_id}:gw${currentEvent.id}`,
      },
    });

    await env.FPL_CACHE.put(dedupKey, '1', { expirationTtl: CAPTAIN_DEDUP_TTL_S });
  }
}
