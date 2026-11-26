import { useEffect, useRef, useState } from 'react';

import { diffLiveSquadEvents } from '@simplyfpl/fpl-client';
import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplLiveGameweek,
  LiveSquadEvent,
} from '@simplyfpl/types';

/** How long an alert stays on screen. */
export const LIVE_EVENT_VISIBLE_MS = 9000;

/** Alerts shown at once. A flurry beyond this drops the oldest. */
export const LIVE_EVENT_MAX_VISIBLE = 3;

/**
 * Merge newly detected events into the ones already showing: newest first, no
 * duplicates, capped. Pure so the queueing can be tested without timers.
 */
export function enqueueLiveEvents(
  current: LiveSquadEvent[],
  incoming: LiveSquadEvent[],
  max: number = LIVE_EVENT_MAX_VISIBLE
): LiveSquadEvent[] {
  if (incoming.length === 0) return current;
  const seen = new Set(current.map((event) => event.id));
  const fresh = incoming.filter((event) => !seen.has(event.id));
  if (fresh.length === 0) return current;
  return [...fresh, ...current].slice(0, max);
}

export interface UseLiveSquadEventsInput {
  picks: FplEntryGameweekPicks | null | undefined;
  liveGw: FplLiveGameweek | undefined;
  bootstrap: FplBootstrapStatic | undefined;
}

export interface UseLiveSquadEventsResult {
  /** Alerts currently on screen, newest first. */
  events: LiveSquadEvent[];
}

/**
 * Alerts for what just happened to the manager's squad.
 *
 * Remembers the previous refresh of the live feed and diffs each new one
 * against it, so a goal shows up within one refresh of FPL publishing it. The
 * first refresh after mount produces nothing: there is nothing to compare with,
 * and replaying the whole gameweek on open would be noise.
 */
export function useLiveSquadEvents(input: UseLiveSquadEventsInput): UseLiveSquadEventsResult {
  const { picks, liveGw, bootstrap } = input;
  const previousRef = useRef<FplLiveGameweek | undefined>(undefined);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const [events, setEvents] = useState<LiveSquadEvent[]>([]);

  useEffect(() => {
    if (!liveGw || !picks || !bootstrap) return;
    const previous = previousRef.current;
    previousRef.current = liveGw;
    if (previous === liveGw) return;

    const detected = diffLiveSquadEvents({ previous, next: liveGw, picks, bootstrap });
    if (detected.length === 0) return;

    setEvents((current) => enqueueLiveEvents(current, detected));
    const ids = new Set(detected.map((event) => event.id));
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      setEvents((current) => current.filter((event) => !ids.has(event.id)));
    }, LIVE_EVENT_VISIBLE_MS);
    timersRef.current.add(timer);
  }, [liveGw, picks, bootstrap]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  return { events };
}
