import { describe, expect, it } from 'vitest';

import type { LiveSquadEvent } from '@simplyfpl/types';

import { enqueueLiveEvents, LIVE_EVENT_MAX_VISIBLE } from './use-live-squad-events';

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
    expect(enqueueLiveEvents(current, [event('a')])).toBe(current);
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
