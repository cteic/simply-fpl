import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { describe, expect, it } from 'vitest';

import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplEntryPick,
  FplFixture,
  FplLiveElement,
  FplLiveGameweek,
} from '@simplyfpl/types';

import { predictBonusPoints } from './bonus-points';
import { calculateLivePoints } from './live-rank';

const feature = await loadFeature('./bonus-points.feature');

const EMPTY_BOOTSTRAP: FplBootstrapStatic = {
  elements: [],
  teams: [],
  events: [],
  element_types: [],
};

function makeElement(id: number, bps: number, opts: { bonus?: number } = {}): FplLiveElement {
  return {
    id,
    stats: {
      minutes: 90,
      goals_scored: 0,
      assists: 0,
      clean_sheets: 0,
      goals_conceded: 0,
      yellow_cards: 0,
      red_cards: 0,
      saves: 0,
      bonus: opts.bonus ?? 0,
      bps,
      total_points: 0,
      clearances_blocks_interceptions: 0,
      tackles: 0,
    },
    explain: [{ fixture: 1, stats: [] }],
  };
}

function makeFixture(
  opts: { finished?: boolean; finished_provisional?: boolean } = {}
): FplFixture {
  return {
    id: 1,
    event: 38,
    finished: opts.finished ?? false,
    finished_provisional: opts.finished_provisional ?? false,
    kickoff_time: '2026-05-24T15:00:00Z',
    team_h: 1,
    team_a: 2,
    team_h_score: null,
    team_a_score: null,
    team_h_difficulty: 3,
    team_a_difficulty: 3,
  };
}

function makeLiveElement(
  id: number,
  opts: { bps?: number; bonus?: number; total_points?: number }
): FplLiveElement {
  return {
    id,
    stats: {
      minutes: 90,
      goals_scored: 0,
      assists: 0,
      clean_sheets: 0,
      goals_conceded: 0,
      yellow_cards: 0,
      red_cards: 0,
      saves: 0,
      bonus: opts.bonus ?? 0,
      bps: opts.bps ?? 0,
      total_points: opts.total_points ?? 0,
      clearances_blocks_interceptions: 0,
      tackles: 0,
    },
    explain: [{ fixture: 1, stats: [] }],
  };
}

function makePicks(
  captainId: number,
  playerIds: number[],
  captainMultiplier = 2
): FplEntryGameweekPicks {
  const picks: FplEntryPick[] = playerIds.map((id, i) => ({
    element: id,
    position: i + 1,
    multiplier: id === captainId ? captainMultiplier : 1,
    is_captain: id === captainId,
    is_vice_captain: false,
  }));
  return {
    active_chip: null,
    automatic_subs: [],
    entry_history: {
      event: 1,
      points: 0,
      total_points: 0,
      rank: 1,
      rank_sort: 1,
      overall_rank: 1,
      event_transfers: 0,
      event_transfers_cost: 0,
      points_on_bench: 0,
    },
    picks,
  };
}

function makeLive(elements: FplLiveElement[]): FplLiveGameweek {
  return { elements };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('BPS ties at third place share the bonus', ({ Given, When, Then, And }) => {
    let liveData: FplLiveGameweek;
    let fixtures: FplFixture[];
    let result: ReturnType<typeof predictBonusPoints>;

    Given('an in-play fixture with bps values 30, 20, 10, 10', () => {
      liveData = makeLive([
        makeElement(101, 30),
        makeElement(102, 20),
        makeElement(103, 10),
        makeElement(104, 10),
      ]);
      fixtures = [makeFixture()];
    });

    When('I predict bonus points for the fixture', () => {
      result = predictBonusPoints(liveData, fixtures, EMPTY_BOOTSTRAP);
    });

    Then('the top player gets 3 predicted bonus', () => {
      expect(result.get(101)).toEqual({ bonus: 3, provisional: true });
    });

    And('the second player gets 2 predicted bonus', () => {
      expect(result.get(102)).toEqual({ bonus: 2, provisional: true });
    });

    And('both third-place players get 1 predicted bonus', () => {
      expect(result.get(103)).toEqual({ bonus: 1, provisional: true });
      expect(result.get(104)).toEqual({ bonus: 1, provisional: true });
    });
  });

  Scenario('Players with zero bps receive no bonus', ({ Given, When, Then, And }) => {
    let liveData: FplLiveGameweek;
    let fixtures: FplFixture[];
    let result: ReturnType<typeof predictBonusPoints>;

    Given('an in-play fixture with bps values 25, 0, 0', () => {
      liveData = makeLive([makeElement(201, 25), makeElement(202, 0), makeElement(203, 0)]);
      fixtures = [makeFixture()];
    });

    When('I predict bonus points for the fixture', () => {
      result = predictBonusPoints(liveData, fixtures, EMPTY_BOOTSTRAP);
    });

    Then('only the top player receives predicted bonus', () => {
      expect(result.get(201)).toEqual({ bonus: 3, provisional: true });
    });

    And('the zero-bps players receive no bonus', () => {
      expect(result.has(202)).toBe(false);
      expect(result.has(203)).toBe(false);
    });
  });

  Scenario('A fixture that has not started produces no bonus', ({ Given, When, Then }) => {
    let liveData: FplLiveGameweek;
    let fixtures: FplFixture[];
    let result: ReturnType<typeof predictBonusPoints>;

    Given('an unstarted fixture with no live data', () => {
      liveData = makeLive([]);
      fixtures = [makeFixture()];
    });

    When('I predict bonus points for the fixture', () => {
      result = predictBonusPoints(liveData, fixtures, EMPTY_BOOTSTRAP);
    });

    Then('no element has a bonus entry', () => {
      expect(result.size).toBe(0);
    });
  });

  Scenario(
    'A finished fixture returns official bonus marked non-provisional',
    ({ Given, When, Then, And }) => {
      let liveData: FplLiveGameweek;
      let fixtures: FplFixture[];
      let result: ReturnType<typeof predictBonusPoints>;

      Given('a finished fixture with official bonus values', () => {
        liveData = makeLive([
          makeElement(301, 30, { bonus: 3 }),
          makeElement(302, 20, { bonus: 2 }),
          makeElement(303, 10, { bonus: 1 }),
        ]);
        fixtures = [makeFixture({ finished: true })];
      });

      When('I predict bonus points for the fixture', () => {
        result = predictBonusPoints(liveData, fixtures, EMPTY_BOOTSTRAP);
      });

      Then('the result uses the official bonus values', () => {
        expect(result.get(301)?.bonus).toBe(3);
        expect(result.get(302)?.bonus).toBe(2);
        expect(result.get(303)?.bonus).toBe(1);
      });

      And('the entries are marked non-provisional', () => {
        expect(result.get(301)?.provisional).toBe(false);
        expect(result.get(302)?.provisional).toBe(false);
        expect(result.get(303)?.provisional).toBe(false);
      });
    }
  );

  Scenario(
    'A finished_provisional fixture keeps official bonus as provisional',
    ({ Given, When, Then }) => {
      let liveData: FplLiveGameweek;
      let fixtures: FplFixture[];
      let result: ReturnType<typeof predictBonusPoints>;

      Given(
        'a finished_provisional fixture where stats.bonus is set but total_points is not yet updated',
        () => {
          liveData = makeLive([
            makeElement(401, 30, { bonus: 3 }),
            makeElement(402, 20, { bonus: 2 }),
          ]);
          fixtures = [makeFixture({ finished: false, finished_provisional: true })];
        }
      );

      When('I predict bonus points for the fixture', () => {
        result = predictBonusPoints(liveData, fixtures, EMPTY_BOOTSTRAP);
      });

      Then('the official bonus is returned as provisional', () => {
        expect(result.get(401)).toEqual({ bonus: 3, provisional: true });
        expect(result.get(402)).toEqual({ bonus: 2, provisional: true });
      });
    }
  );
});

describe('finished_provisional bonus transition monotonicity', () => {
  const EMPTY_BOOTSTRAP: FplBootstrapStatic = {
    elements: [],
    teams: [],
    events: [],
    element_types: [],
  };

  it('captain points do not drop when a fixture transitions through finished_provisional', () => {
    const captainId = 501;
    const otherIds = [502, 503, 504, 505, 506, 507, 508, 509, 510, 511];
    const allIds = [captainId, ...otherIds];
    const picks = makePicks(captainId, allIds, 2);

    const basePoints = 10;
    const officialBonus = 3;

    const tick1Live: FplLiveGameweek = {
      elements: allIds.map((id) => ({
        ...makeLiveElement(id, { bps: id === captainId ? 30 : 0, total_points: basePoints }),
        explain: [{ fixture: 1, stats: [] }],
      })),
    };
    const tick1Fixture: FplFixture[] = [
      makeFixture({ finished: false, finished_provisional: false }),
    ];

    const tick2Live: FplLiveGameweek = {
      elements: allIds.map((id) => ({
        ...makeLiveElement(id, {
          bps: id === captainId ? 30 : 0,
          bonus: id === captainId ? officialBonus : 0,
          total_points: basePoints,
        }),
        explain: [{ fixture: 1, stats: [] }],
      })),
    };
    const tick2Fixture: FplFixture[] = [
      makeFixture({ finished: false, finished_provisional: true }),
    ];

    const tick3Live: FplLiveGameweek = {
      elements: allIds.map((id) => ({
        ...makeLiveElement(id, {
          bps: id === captainId ? 30 : 0,
          bonus: id === captainId ? officialBonus : 0,
          total_points: id === captainId ? basePoints + officialBonus : basePoints,
        }),
        explain: [{ fixture: 1, stats: [] }],
      })),
    };
    const tick3Fixture: FplFixture[] = [
      makeFixture({ finished: true, finished_provisional: true }),
    ];

    const bonusMap1 = predictBonusPoints(tick1Live, tick1Fixture, EMPTY_BOOTSTRAP);
    const bonusMap2 = predictBonusPoints(tick2Live, tick2Fixture, EMPTY_BOOTSTRAP);
    const bonusMap3 = predictBonusPoints(tick3Live, tick3Fixture, EMPTY_BOOTSTRAP);

    const points1 = calculateLivePoints(picks, tick1Live, EMPTY_BOOTSTRAP, bonusMap1);
    const points2 = calculateLivePoints(picks, tick2Live, EMPTY_BOOTSTRAP, bonusMap2);
    const points3 = calculateLivePoints(picks, tick3Live, EMPTY_BOOTSTRAP, bonusMap3);

    expect(points2).toBeGreaterThanOrEqual(points1);
    expect(points3).toBeGreaterThanOrEqual(points2);
  });
});
