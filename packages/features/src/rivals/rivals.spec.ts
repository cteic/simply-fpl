import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplEntryPick,
  FplLeagueStanding,
  FplLiveGameweek,
} from '@simplyfpl/types';

import { type Differentials, computeDifferentials } from './compute-differentials';
import { type RivalRow, computeRivalsBoard } from './compute-rivals-board';

const feature = await loadFeature('./rivals.feature');

const BOOTSTRAP: FplBootstrapStatic = { elements: [], teams: [], events: [], element_types: [] };
const NO_STANDINGS: FplLeagueStanding[] = [];

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

function makeXi(startElement: number, captainEl: number): FplEntryPick[] {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((pos) => {
    const el = startElement + pos - 1;
    const isCap = el === captainEl;
    return makePick(el, pos, isCap ? 2 : 1, isCap);
  });
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Rivals board shows live rank with correct ordering', ({ Given, When, Then }) => {
    let result: RivalRow[];

    Given('two rivals where rival A scores 60 and rival B scores 45 live', () => {});

    When('I compute the rivals board', () => {
      const scoresA: Record<number, number> = {};
      const scoresB: Record<number, number> = {};
      for (let i = 0; i < 11; i++) {
        scoresA[1 + i] = i === 0 ? 20 : 4;
        scoresB[100 + i] = i === 0 ? 5 : 4;
      }
      const liveData = makeLive({ ...scoresA, ...scoresB });
      result = computeRivalsBoard(
        0,
        NO_STANDINGS,
        [
          {
            entryId: 1,
            entryName: 'Alpha FC',
            playerName: 'Alice',
            picks: makePicks(null, 0, makeXi(1, 1)),
          },
          {
            entryId: 2,
            entryName: 'Beta FC',
            playerName: 'Bob',
            picks: makePicks(null, 0, makeXi(100, 100)),
          },
        ],
        liveData,
        BOOTSTRAP
      );
    });

    Then('rival A should appear first with rank 1', () => {
      expect(result[0]?.entryId).toBe(1);
    });
  });

  Scenario('Differentials show players unique to each manager', ({ Given, When, Then, And }) => {
    let result: Differentials;
    const myPicks = makePicks(null, 0, [
      makePick(10, 1, 2, true),
      ...[2, 3, 4, 5, 6, 7, 8, 9, 11, 12].map((n, i) => makePick(n, i + 2, 1)),
    ]);
    const theirPicks = makePicks(null, 0, [
      makePick(20, 1, 2, true),
      ...[2, 3, 4, 5, 6, 7, 8, 9, 11, 12].map((n, i) => makePick(n, i + 2, 1)),
    ]);

    Given('my squad has player 10 but the rival does not', () => {});

    And('the rival squad has player 20 but I do not', () => {});

    When('I compute the differentials', () => {
      result = computeDifferentials(myPicks, theirPicks);
    });

    Then('player 10 should be in my unique picks', () => {
      expect(result.yoursOnly).toContain(10);
    });

    And('player 20 should be in the rival unique picks', () => {
      expect(result.theirsOnly).toContain(20);
    });
  });

  Scenario(
    'Differentials report same captaincy when both managers captain the same player',
    ({ Given, When, Then }) => {
      let result: Differentials;

      Given('both managers captain player 5', () => {});

      When('I compute the differentials', () => {
        const picks = (captainEl: number) =>
          makePicks(null, 0, [
            makePick(captainEl, 1, 2, true),
            ...[1, 2, 3, 4, 6, 7, 8, 9, 10, 11].map((n, i) => makePick(n, i + 2, 1)),
          ]);
        result = computeDifferentials(picks(5), picks(5));
      });

      Then('the captaincy diff same flag should be true', () => {
        expect(result.captaincyDiff.same).toBe(true);
        expect(result.captaincyDiff.yours).toBe(5);
      });
    }
  );
});
