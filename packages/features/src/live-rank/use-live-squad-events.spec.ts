import { describe, expect, it } from 'vitest';

import type { LiveSquadEvent } from '@simplyfpl/types';

import {
  LIVE_EVENT_MAX_VISIBLE,
  baselineForGameweek,
  enqueueLiveEvents,
} from './use-live-squad-events';

function event(id: string): LiveSquadEvent {
  return {
    id,
    kind: 'goal',
    elementId: 1,
    playerName: 'Palmer',
    isCaptain: false,
    onBench: false,
    pointsDelta: 5,
  };
}

describe('enqueueLiveEvents', () => {
  it('puts the newest alert first', () => {
    const queue = enqueueLiveEvents([event('a')], [event('b')]);
    expect(queue.map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('does not show the same occurrence twice', () => {
    const current = [event('a')];
    // A re-render with an unchanged feed must not re-announce a goal.
    const queue = enqueueLiveEvents(current, [event('a')]);
    expect(queue).toBe(current);
    expect(queue.map((e) => e.id)).toEqual(['a']);
  });

  it('returns the same array when nothing new arrived, so nothing re-renders', () => {
    const current = [event('a')];
    expect(enqueueLiveEvents(current, [])).toBe(current);
  });

  it('caps a flurry and keeps the most recent', () => {
    const current = [event('a'), event('b'), event('c')];
    const queue = enqueueLiveEvents(current, [event('d'), event('e')]);
    expect(queue).toHaveLength(LIVE_EVENT_MAX_VISIBLE);
    expect(queue.map((e) => e.id)).toEqual(['d', 'e', 'a']);
  });
});

describe('baselineForGameweek', () => {
  it('keeps the previous snapshot within one gameweek', () => {
    const snapshot = { elements: [] };
    expect(baselineForGameweek(snapshot, 11, 11)).toBe(snapshot);
  });

  it('drops it when the gameweek changes, so last week is never diffed against this one', () => {
    expect(baselineForGameweek({ elements: [] }, 11, 12)).toBeUndefined();
  });

  it('has nothing to compare with on the first refresh', () => {
    expect(baselineForGameweek(undefined, null, 11)).toBeUndefined();
  });
});
