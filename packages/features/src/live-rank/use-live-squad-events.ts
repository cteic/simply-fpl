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

/**
 * The snapshot a new refresh may be compared with. Only one from the same
 * gameweek: every player's stats restart at zero in a new gameweek, so a diff
 * across the boundary reads last week's clean sheet as one just lost.
 */
export function baselineForGameweek<T>(
  previous: T | undefined,
  previousGameweek: number | null,
  gameweek: number
): T | undefined {
  return previousGameweek === gameweek ? previous : undefined;
}

export interface UseLiveSquadEventsInput {
  picks: FplEntryGameweekPicks | null | undefined;
  liveGw: FplLiveGameweek | undefined;
  bootstrap: FplBootstrapStatic | undefined;
  /**
   * Called once with each batch of newly detected events, before they are
   * queued for display. Lets a platform raise its own alert, such as a browser
   * notification while the tab is in the background.
   */
  onDetected?: (events: LiveSquadEvent[]) => void;
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
  const { picks, liveGw, bootstrap, onDetected } = input;
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const previousRef = useRef<FplLiveGameweek | undefined>(undefined);
  const gameweekRef = useRef<number | null>(null);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const [events, setEvents] = useState<LiveSquadEvent[]>([]);

  useEffect(() => {
    if (!liveGw || !picks || !bootstrap) return;
    const gameweek = picks.entry_history.event;
    const crossedGameweek = gameweekRef.current !== null && gameweekRef.current !== gameweek;
    const previous = baselineForGameweek(previousRef.current, gameweekRef.current, gameweek);
    previousRef.current = liveGw;
    gameweekRef.current = gameweek;
    if (crossedGameweek) {
      for (const pending of timersRef.current) clearTimeout(pending);
      timersRef.current.clear();
      setEvents([]);
    }
    if (previous === liveGw) return;

    const detected = diffLiveSquadEvents({ previous, next: liveGw, picks, bootstrap });
    if (detected.length === 0) return;

    onDetectedRef.current?.(detected);
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
