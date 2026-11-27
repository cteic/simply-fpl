import { describe, expect, it } from 'vitest';

import type { LiveSquadEvent } from '@simplyfpl/types';

import { buildEventNotification, shouldNotify, shouldOfferAlerts } from './event-notifications';

function makeEvent(overrides: Partial<LiveSquadEvent>): LiveSquadEvent {
  return {
    id: 'goal-7-1',
    kind: 'goal',
    elementId: 7,
    playerName: 'Saka',
    pointsDelta: 5,
    isCaptain: false,
    onBench: false,
    ...overrides,
  };
}

describe('shouldNotify', () => {
  it('notifies only when the tab is hidden and permission is granted', () => {
    expect(shouldNotify('granted', true)).toBe(true);
    expect(shouldNotify('granted', false)).toBe(false);
    expect(shouldNotify('default', true)).toBe(false);
    expect(shouldNotify('denied', true)).toBe(false);
    expect(shouldNotify('unsupported', true)).toBe(false);
  });
});

describe('shouldOfferAlerts', () => {
  it('offers only while the question is open and not dismissed', () => {
    expect(shouldOfferAlerts('default', false)).toBe(true);
    expect(shouldOfferAlerts('default', true)).toBe(false);
    expect(shouldOfferAlerts('granted', false)).toBe(false);
    expect(shouldOfferAlerts('denied', false)).toBe(false);
    expect(shouldOfferAlerts('unsupported', false)).toBe(false);
  });
});

describe('buildEventNotification', () => {
  it('names the event, the player and the points', () => {
    expect(buildEventNotification(makeEvent({}), 'Goal', undefined)).toEqual({
      title: 'Goal: Saka',
      body: '+5 pts',
      tag: 'goal-7-1',
    });
  });

  it('adds the captain or bench detail', () => {
    const note = buildEventNotification(makeEvent({ pointsDelta: 10 }), 'Goal', 'your captain');
    expect(note.body).toBe('+10 pts, your captain');
  });

  it('shows lost points with a minus sign and omits zero', () => {
    const lost = makeEvent({ kind: 'red_card', pointsDelta: -3 });
    expect(buildEventNotification(lost, 'Red card', undefined).body).toBe('\u22123 pts');
    expect(buildEventNotification(makeEvent({ pointsDelta: 0 }), 'Goal', undefined).body).toBe('');
  });
});
