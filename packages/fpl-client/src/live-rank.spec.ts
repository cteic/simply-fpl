import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplEntryPick,
  FplLiveGameweek,
} from '@simplyfpl/types';

import {
  buildLiveLeagueTable,
  calculateLivePoints,
  estimateLiveRank,
  getCurrentGameweek,
  getNextGameweek,
} from './live-rank';

const feature = await loadFeature('./live-rank.feature');

const EMPTY_BOOTSTRAP: FplBootstrapStatic = {
  elements: [],
  teams: [],
  events: [],
  element_types: [],
};

function makePick(
  element: number,
  position: number,
  multiplier: number,
  isCaptain = false
): FplEntryPick {
  return { element, position, multiplier, is_captain: isCaptain, is_vice_captain: false };
}

function makePicks(
  chip: string | null,
  transferCost: number,
  picks: FplEntryPick[]
): FplEntryGameweekPicks {
  return {
    active_chip: chip,
    automatic_subs: [],
    entry_history: {
      event: 1,
      points: 0,
      total_points: 0,
      rank: 1,
      rank_sort: 1,
      overall_rank: 1,
      event_transfers: 0,
      event_transfers_cost: transferCost,
      points_on_bench: 0,
    },
    picks,
  };
}

function makeLive(scores: Record<number, number>): FplLiveGameweek {
  return {
    elements: Object.entries(scores).map(([id, total_points]) => ({
      id: Number(id),
      stats: {
        minutes: 90,
        goals_scored: 0,
        assists: 0,
        clean_sheets: 0,
        goals_conceded: 0,
        yellow_cards: 0,
        red_cards: 0,
        saves: 0,
        bonus: 0,
        bps: 0,
        total_points,
      },
      explain: [],
    })),
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Captain scores double in a standard squad', ({ Given, When, Then }) => {
    let picks: FplEntryGameweekPicks;
    let liveData: FplLiveGameweek;
    let result: number;

    Given('an 11-player squad where each player scores 5 points and the captain scores 10', () => {
      const scores: Record<number, number> = {};
      for (let i = 1; i <= 11; i++) scores[i] = i === 1 ? 10 : 5;
      liveData = makeLive(scores);
      picks = makePicks(null, 0, [
        makePick(1, 1, 2, true),
        ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => makePick(n, n, 1)),
      ]);
    });

    When('I calculate live points', () => {
      result = calculateLivePoints(picks, liveData, EMPTY_BOOTSTRAP);
    });

    Then('the total should be 70', () => {
      expect(result).toBe(70);
    });
  });

  Scenario('Triple Captain chip triples the captain score', ({ Given, When, Then }) => {
    let picks: FplEntryGameweekPicks;
    let liveData: FplLiveGameweek;
    let result: number;

    Given('an 11-player squad with the Triple Captain chip and a captain scoring 10', () => {
      const scores: Record<number, number> = {};
      for (let i = 1; i <= 11; i++) scores[i] = i === 1 ? 10 : 5;
      liveData = makeLive(scores);
      picks = makePicks('3xc', 0, [
        makePick(1, 1, 3, true),
        ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => makePick(n, n, 1)),
      ]);
    });

    When('I calculate live points', () => {
      result = calculateLivePoints(picks, liveData, EMPTY_BOOTSTRAP);
    });

    Then('the total should be 80', () => {
      expect(result).toBe(80);
    });
  });

  Scenario('Transfer hit is deducted from live points', ({ Given, When, Then }) => {
    let picks: FplEntryGameweekPicks;
    let liveData: FplLiveGameweek;
    let result: number;

    Given('an 11-player squad scoring 50 gross points with a 4-point transfer hit', () => {
      const scores: Record<number, number> = {};
      for (let i = 1; i <= 11; i++) scores[i] = i === 1 ? 5 : 4;
      liveData = makeLive(scores);
      picks = makePicks(null, 4, [
        makePick(1, 1, 2, true),
        ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => makePick(n, n, 1)),
      ]);
    });

    When('I calculate live points', () => {
      result = calculateLivePoints(picks, liveData, EMPTY_BOOTSTRAP);
    });

    Then('the net total should be 46', () => {
      expect(result).toBe(46);
    });
  });

  Scenario('Bench Boost chip counts all 15 players', ({ Given, When, Then }) => {
    let picks: FplEntryGameweekPicks;
    let liveData: FplLiveGameweek;
    let result: number;

    Given('15 players each scoring 5 points with Bench Boost chip active', () => {
      const scores: Record<number, number> = {};
      for (let i = 1; i <= 15; i++) scores[i] = 5;
      liveData = makeLive(scores);
      picks = makePicks('bboost', 0, [
        makePick(1, 1, 1, false),
        ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => makePick(n, n, 1)),
        ...[12, 13, 14, 15].map((n) => makePick(n, n, 1)),
      ]);
    });

    When('I calculate live points', () => {
      result = calculateLivePoints(picks, liveData, EMPTY_BOOTSTRAP);
    });

    Then('the total should be 75', () => {
      expect(result).toBe(75);
    });
  });

  Scenario('Build live league table sorts by points descending', ({ Given, When, Then }) => {
    let tableResult: ReturnType<typeof buildLiveLeagueTable>;

    Given('three managers with live points of 60, 40, and 50', () => {});

    When('I build the live league table', () => {
      const scores60: Record<number, number> = {};
      const scores40: Record<number, number> = {};
      const scores50: Record<number, number> = {};
      for (let i = 1; i <= 11; i++) {
        scores60[i + 100] = i === 1 ? 20 : 4;
        scores40[i + 200] = i === 1 ? 0 : 4;
        scores50[i + 300] = i === 1 ? 10 : 4;
      }
      const liveData = makeLive({ ...scores60, ...scores40, ...scores50 });
      const entries = [
        {
          entryId: 1,
          entryName: 'Alpha FC',
          playerName: 'Alice',
          previousRank: 2,
          picks: makePicks(null, 0, [
            makePick(101, 1, 2, true),
            ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => makePick(101 + n, n, 1)),
          ]),
        },
        {
          entryId: 2,
          entryName: 'Beta FC',
          playerName: 'Bob',
          previousRank: 1,
          picks: makePicks(null, 0, [
            makePick(201, 1, 2, true),
            ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => makePick(201 + n, n, 1)),
          ]),
        },
        {
          entryId: 3,
          entryName: 'Gamma FC',
          playerName: 'Carol',
          previousRank: 3,
          picks: makePicks(null, 0, [
            makePick(301, 1, 2, true),
            ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => makePick(301 + n, n, 1)),
          ]),
        },
      ];
      tableResult = buildLiveLeagueTable(entries, liveData, EMPTY_BOOTSTRAP);
    });

    Then('the managers should be ranked first, third, and second', () => {
      expect(tableResult[0]?.entryId).toBe(1);
      expect(tableResult[1]?.entryId).toBe(3);
      expect(tableResult[2]?.entryId).toBe(2);
    });
  });

  Scenario('Get current gameweek from bootstrap data', ({ Given, When, Then }) => {
    let gwResult: number | null;
    const bootstrap: FplBootstrapStatic = {
      elements: [],
      teams: [],
      element_types: [],
      events: [
        {
          id: 1,
          name: 'Gameweek 1',
          deadline_time: '2025-08-15T17:30:00Z',
          is_current: true,
          is_next: false,
          is_previous: false,
          average_entry_score: 52,
          highest_score: null,
          finished: false,
        },
      ],
    };

    Given('bootstrap data with gameweek 1 marked as current', () => {});

    When('I get the current gameweek', () => {
      gwResult = getCurrentGameweek(bootstrap);
    });

    Then('it should return 1', () => {
      expect(gwResult).toBe(1);
    });
  });

  Scenario('Get next gameweek from bootstrap data', ({ Given, When, Then }) => {
    let gwResult: number | null;
    const bootstrap: FplBootstrapStatic = {
      elements: [],
      teams: [],
      element_types: [],
      events: [
        {
          id: 1,
          name: 'Gameweek 1',
          deadline_time: '2025-08-15T17:30:00Z',
          is_current: true,
          is_next: false,
          is_previous: false,
          average_entry_score: 52,
          highest_score: null,
          finished: false,
        },
        {
          id: 2,
          name: 'Gameweek 2',
          deadline_time: '2025-08-22T17:30:00Z',
          is_current: false,
          is_next: true,
          is_previous: false,
          average_entry_score: 0,
          highest_score: null,
          finished: false,
        },
      ],
    };

    Given('bootstrap data with gameweek 2 marked as next', () => {});

    When('I get the next gameweek', () => {
      gwResult = getNextGameweek(bootstrap);
    });

    Then('it should return 2', () => {
      expect(gwResult).toBe(2);
    });
  });

  Scenario('Live rank estimate moves up when scoring above average', ({ Given, When, Then }) => {
    let estimate: ReturnType<typeof estimateLiveRank>;
    let preGwRank = 0;
    let avgScore = 0;
    let livePoints = 0;

    Given('my pre-gameweek rank is 100000 and the average score is 30', () => {
      preGwRank = 100000;
      avgScore = 30;
    });

    When('I score 50 live points', () => {
      livePoints = 50;
      estimate = estimateLiveRank(preGwRank, livePoints, avgScore);
    });

    Then('the live rank estimate is 86000 with movement up 14000', () => {
      expect(estimate.liveRank).toBe(86000);
      expect(estimate.movement).toBe(14000);
      expect(estimate.direction).toBe('up');
    });
  });

  Scenario('Live rank estimate moves down when scoring below average', ({ Given, When, Then }) => {
    let estimate: ReturnType<typeof estimateLiveRank>;
    let preGwRank = 0;
    let avgScore = 0;
    let livePoints = 0;

    Given('my pre-gameweek rank is 100000 and the average score is 50', () => {
      preGwRank = 100000;
      avgScore = 50;
    });

    When('I score 30 live points', () => {
      livePoints = 30;
      estimate = estimateLiveRank(preGwRank, livePoints, avgScore);
    });

    Then('the live rank estimate is 114000 with movement down 14000', () => {
      expect(estimate.liveRank).toBe(114000);
      expect(estimate.movement).toBe(-14000);
      expect(estimate.direction).toBe('down');
    });
  });

  Scenario('Live rank estimate clamps to 1 at the top', ({ Given, When, Then }) => {
    let estimate: ReturnType<typeof estimateLiveRank>;
    let preGwRank = 0;
    let avgScore = 0;
    let livePoints = 0;

    Given('my pre-gameweek rank is 500 and the average score is 30', () => {
      preGwRank = 500;
      avgScore = 30;
    });

    When('I score 100 live points', () => {
      livePoints = 100;
      estimate = estimateLiveRank(preGwRank, livePoints, avgScore);
    });

    Then('the live rank estimate is 1 with movement up 49000', () => {
      expect(estimate.liveRank).toBe(1);
      expect(estimate.movement).toBe(49000);
      expect(estimate.direction).toBe('up');
    });
  });
});
