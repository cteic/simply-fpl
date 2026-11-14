import type { FplBootstrapStatic } from '@simplyfpl/types';

import type { Env } from '../index';
import { buildDeepLink } from './deep-links';
import { dispatchNotification } from './dispatch';

const BOOTSTRAP_KEY = 'fpl:/bootstrap-static/';
// Remind once the deadline is within this window. The frequent crons tick every 10-15 minutes,
// so every deadline gets a tick inside it whatever time of day it falls.
const REMIND_WITHIN_MS = 60 * 60 * 1000;
const SENT_TTL_SECONDS = 2 * 60 * 60;

function hasEvents(value: unknown): value is Pick<FplBootstrapStatic, 'events'> {
  return (
    typeof value === 'object' && value !== null && 'events' in value && Array.isArray(value.events)
  );
}

async function loadEvents(env: Env): Promise<FplBootstrapStatic['events'] | null> {
  let raw = await env.FPL_CACHE.get(BOOTSTRAP_KEY, 'text');
  if (raw === null) {
    const res = await fetch(`${env.FPL_BASE_URL}/bootstrap-static/`, {
      headers: { 'User-Agent': 'SimplyFPL/1.0', Accept: 'application/json' },
    });
    if (!res.ok) return null;
    raw = await res.text();
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return hasEvents(parsed) ? parsed.events : null;
  } catch {
    return null;
  }
}

export function nextDeadline(
  events: FplBootstrapStatic['events'],
  now: number
): { gameweek: number; msUntil: number } | null {
  for (const event of events) {
    const deadline = Date.parse(event.deadline_time);
    if (!Number.isFinite(deadline) || deadline <= now) continue;
    return { gameweek: event.id, msUntil: deadline - now };
  }
  return null;
}

// Sends at most one reminder per gameweek, and only when that gameweek's real deadline is
// under an hour away. A fixed daily cron used to send it every day at 17:30 UTC.
export async function runDeadlineReminder(env: Env, now: number = Date.now()): Promise<void> {
  const events = await loadEvents(env);
  if (!events) return;

  const next = nextDeadline(events, now);
  if (!next || next.msUntil > REMIND_WITHIN_MS) return;

  const sentKey = `notify:deadline-sent:gw${next.gameweek}`;
  if (await env.FPL_CACHE.get(sentKey, 'text')) return;
  await env.FPL_CACHE.put(sentKey, '1', { expirationTtl: SENT_TTL_SECONDS });

  const minutes = Math.max(1, Math.round(next.msUntil / 60_000));
  await dispatchNotification(env, {
    event: 'deadline_reminder',
    payload: {
      type: 'deadline_reminder',
      title: `FPL deadline in ${minutes} minutes`,
      body: 'Make your transfers now before the gameweek locks.',
      url: buildDeepLink('deadline_reminder'),
      tag: 'deadline',
    },
  });
}
