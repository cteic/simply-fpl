import { describe, expect, it } from 'vitest';

import type { FplDifficulty, FplEvent, FplFixture } from '@simplyfpl/types';

import {
  CADENCE_BONUS_SETTLING_MS,
  CADENCE_GW_LIVE_NO_MATCH_MS,
  CADENCE_IDLE_MS,
  CADENCE_MATCH_MS,
  CADENCE_PRE_MATCH_MS,
  isGameweekFinishedAndBonusLocked,
  pickCadenceMs,
} from './cadence';

const NOW = new Date('2026-05-15T15:00:00.000Z');

function makeEvent(overrides: Partial<FplEvent> = {}): FplEvent {
  return {
    id: 39,
    name: 'Gameweek 39',
    deadline_time: new Date(NOW.getTime() - 10 * 60 * 1000).toISOString(),
    is_current: true,
    is_next: false,
    is_previous: false,
    average_entry_score: 0,
    highest_score: null,
    finished: false,
    ...overrides,
  };
}

function makeFixture(overrides: Partial<FplFixture> = {}): FplFixture {
  const difficulty: FplDifficulty = 3;
  return {
    id: 1,
    event: 39,
    finished: false,
    kickoff_time: NOW.toISOString(),
    team_h: 1,
    team_a: 2,
    team_h_score: null,
    team_a_score: null,
    team_h_difficulty: difficulty,
    team_a_difficulty: difficulty,
    ...overrides,
  };
}

describe('pickCadenceMs', () => {
  it('returns 5s when a fixture is in progress', () => {
    const fixtures = [
      makeFixture({ kickoff_time: new Date(NOW.getTime() - 30 * 60 * 1000).toISOString() }),
    ];
    expect(pickCadenceMs(NOW, [makeEvent()], fixtures)).toBe(CADENCE_MATCH_MS);
  });

  it('returns 120s when a match starts within 30 minutes', () => {
    const fixtures = [
      makeFixture({ kickoff_time: new Date(NOW.getTime() + 15 * 60 * 1000).toISOString() }),
    ];
    expect(pickCadenceMs(NOW, [makeEvent()], fixtures)).toBe(CADENCE_PRE_MATCH_MS);
  });

  it('returns 30s within 2h of FT when bonus not locked (event not finished)', () => {
    const fixtures = [
      makeFixture({
        finished: true,
        kickoff_time: new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      }),
    ];
    expect(pickCadenceMs(NOW, [makeEvent({ finished: false })], fixtures)).toBe(
      CADENCE_BONUS_SETTLING_MS
    );
  });

  it('returns 120s when gameweek live but no active match', () => {
    const fixtures = [
      makeFixture({ kickoff_time: new Date(NOW.getTime() + 8 * 60 * 60 * 1000).toISOString() }),
    ];
    expect(pickCadenceMs(NOW, [makeEvent()], fixtures)).toBe(CADENCE_GW_LIVE_NO_MATCH_MS);
  });

  it('returns 5min when gameweek not yet live and deadline > 1h away', () => {
    const event = makeEvent({
      deadline_time: new Date(NOW.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    });
    const fixtures = [
      makeFixture({ kickoff_time: new Date(NOW.getTime() + 25 * 60 * 60 * 1000).toISOString() }),
    ];
    expect(pickCadenceMs(NOW, [event], fixtures)).toBe(CADENCE_IDLE_MS);
  });

  it('returns null when current event is finished', () => {
    expect(pickCadenceMs(NOW, [makeEvent({ finished: true })], [])).toBeNull();
  });

  it('returns idle cadence when there is no current event', () => {
    const events = [makeEvent({ is_current: false, is_next: true })];
    expect(pickCadenceMs(NOW, events, [])).toBe(CADENCE_IDLE_MS);
  });

  it('treats FT just after kickoff+120m as bonus-settling', () => {
    const kickoff = new Date(NOW.getTime() - (120 + 30) * 60 * 1000).toISOString();
    const fixtures = [makeFixture({ finished: true, kickoff_time: kickoff })];
    expect(pickCadenceMs(NOW, [makeEvent()], fixtures)).toBe(CADENCE_BONUS_SETTLING_MS);
  });

  it('drops out of bonus-settling once 2h after FT has elapsed', () => {
    const kickoff = new Date(NOW.getTime() - (120 + 3 * 60) * 60 * 1000).toISOString();
    const fixtures = [makeFixture({ finished: true, kickoff_time: kickoff })];
    expect(pickCadenceMs(NOW, [makeEvent()], fixtures)).toBe(CADENCE_GW_LIVE_NO_MATCH_MS);
  });
});

describe('isGameweekFinishedAndBonusLocked', () => {
  it('returns false when current event is not finished', () => {
    const fixtures = [makeFixture({ finished: true })];
    expect(isGameweekFinishedAndBonusLocked([makeEvent()], fixtures)).toBe(false);
  });

  it('returns true when event is finished and all fixtures are finished', () => {
    const fixtures = [makeFixture({ finished: true })];
    expect(isGameweekFinishedAndBonusLocked([makeEvent({ finished: true })], fixtures)).toBe(true);
  });

  it('returns false when event finished but a fixture is still unfinished', () => {
    const fixtures = [makeFixture({ finished: false })];
    expect(isGameweekFinishedAndBonusLocked([makeEvent({ finished: true })], fixtures)).toBe(false);
  });
});
