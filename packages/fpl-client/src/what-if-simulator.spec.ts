import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplEntryPick,
  FplLiveGameweek,
} from '@simplyfpl/types';

import { simulateWhatIf } from './what-if-simulator';
import type { WhatIfResult } from './what-if-simulator';

const feature = await loadFeature('./what-if-simulator.feature');

const EMPTY_BOOTSTRAP: FplBootstrapStatic = {
  elements: [],
  teams: [],
  events: [],
  element_types: [],
};

const PRE_GW_RANK = 100_000;
const AVG_ENTRY_SCORE = 30;

function makePick(
  element: number,
  position: number,
  multiplier: number,
  isCaptain = false
): FplEntryPick {
  return { element, position, multiplier, is_captain: isCaptain, is_vice_captain: false };
}

function makePicks(chip: string | null, picks: FplEntryPick[]): FplEntryGameweekPicks {
  return {
    active_chip: chip,
    automatic_subs: [],
    entry_history: {
      event: 1,
      points: 0,
      total_points: 0,
      rank: 1,
      rank_sort: 1,
      overall_rank: PRE_GW_RANK,
      event_transfers: 0,
      event_transfers_cost: 0,
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
  Scenario(
    'Transferring in Haaland as captain to replace captain Salah increases total by 16 points',
    ({ Given, And, When, Then }) => {
      let picks: FplEntryGameweekPicks;
      let liveGw: FplLiveGameweek;
      let currentLivePoints: number;
      let result: WhatIfResult | null;

      Given(
        'a live gameweek where Salah is captain scoring 4 points and the rest of the XI each score 2',
        () => {
          const scores: Record<number, number> = { 1: 4 };
          for (let i = 2; i <= 11; i++) scores[i] = 2;
          liveGw = makeLive(scores);
          picks = makePicks(null, [
            makePick(1, 1, 2, true),
            ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => makePick(n, n, 1)),
          ]);
          currentLivePoints = 4 * 2 + 10 * 2;
        }
      );

      And('Haaland is available in bootstrap scoring 12 points live', () => {
        const scores = {
          ...Object.fromEntries(liveGw.elements.map((e) => [e.id, e.stats.total_points])),
          100: 12,
        };
        liveGw = makeLive(scores);
      });

      When('I simulate a transfer swap from Salah to Haaland', () => {
        result = simulateWhatIf(
          picks,
          liveGw,
          EMPTY_BOOTSTRAP,
          { type: 'transfer', from: 1, to: 100 },
          PRE_GW_RANK,
          AVG_ENTRY_SCORE,
          currentLivePoints
        );
      });

      Then('the simulated total increases by 16 points', () => {
        expect(result).not.toBeNull();
        expect(result?.deltaPoints).toBe(16);
      });

      And('the estimated rank improves', () => {
        expect(result?.deltaRank).toBeGreaterThan(0);
      });
    }
  );

  Scenario(
    'Swapping captain from Salah to Haaland when both are in the XI increases total by 8 points',
    ({ Given, When, Then, And }) => {
      let picks: FplEntryGameweekPicks;
      let liveGw: FplLiveGameweek;
      let currentLivePoints: number;
      let result: WhatIfResult | null;

      Given(
        'a live gameweek where Salah is captain scoring 4 points and Haaland is also in the XI scoring 12 points and the remaining 9 each score 2',
        () => {
          const scores: Record<number, number> = { 1: 4, 2: 12 };
          for (let i = 3; i <= 11; i++) scores[i] = 2;
          liveGw = makeLive(scores);
          picks = makePicks(null, [
            makePick(1, 1, 2, true),
            makePick(2, 2, 1),
            ...[3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => makePick(n, n, 1)),
          ]);
          currentLivePoints = 4 * 2 + 12 + 9 * 2;
        }
      );

      When('I simulate a captain swap from Salah to Haaland', () => {
        result = simulateWhatIf(
          picks,
          liveGw,
          EMPTY_BOOTSTRAP,
          { type: 'captain', from: 1, to: 2 },
          PRE_GW_RANK,
          AVG_ENTRY_SCORE,
          currentLivePoints
        );
      });

      Then('the simulated total increases by 8 points', () => {
        expect(result).not.toBeNull();
        expect(result?.deltaPoints).toBe(8);
      });

      And('the estimated rank improves', () => {
        expect(result?.deltaRank).toBeGreaterThan(0);
      });
    }
  );

  Scenario('Captain not in starting XI returns no result', ({ Given, When, Then }) => {
    let picks: FplEntryGameweekPicks;
    let liveGw: FplLiveGameweek;
    let result: WhatIfResult | null;

    Given('a live gameweek where the captain is on the bench at position 12', () => {
      const scores: Record<number, number> = {};
      for (let i = 1; i <= 15; i++) scores[i] = 5;
      liveGw = makeLive(scores);
      picks = makePicks(null, [
        ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => makePick(n, n, 1)),
        makePick(12, 12, 2, true),
        makePick(13, 13, 1),
        makePick(14, 14, 1),
        makePick(15, 15, 1),
      ]);
    });

    When('I simulate a captain swap targeting that bench player', () => {
      result = simulateWhatIf(
        picks,
        liveGw,
        EMPTY_BOOTSTRAP,
        { type: 'captain', from: 12, to: 1 },
        PRE_GW_RANK,
        AVG_ENTRY_SCORE,
        55
      );
    });

    Then('the simulation result is null', () => {
      expect(result).toBeNull();
    });
  });

  Scenario(
    'Swapping a bench player out via transfer returns no result',
    ({ Given, When, Then }) => {
      let picks: FplEntryGameweekPicks;
      let liveGw: FplLiveGameweek;
      let result: WhatIfResult | null;

      Given('a live gameweek with a normal starting XI', () => {
        const scores: Record<number, number> = {};
        for (let i = 1; i <= 15; i++) scores[i] = 5;
        liveGw = makeLive(scores);
        picks = makePicks(null, [
          makePick(1, 1, 2, true),
          ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => makePick(n, n, 1)),
          ...[12, 13, 14, 15].map((n) => makePick(n, n, 1)),
        ]);
      });

      When('I simulate a transfer of a player at bench position 12', () => {
        result = simulateWhatIf(
          picks,
          liveGw,
          EMPTY_BOOTSTRAP,
          { type: 'transfer', from: 12, to: 100 },
          PRE_GW_RANK,
          AVG_ENTRY_SCORE,
          55
        );
      });

      Then('the simulation result is null', () => {
        expect(result).toBeNull();
      });
    }
  );

  Scenario('Swapping a player with themselves returns no result', ({ Given, When, Then }) => {
    let picks: FplEntryGameweekPicks;
    let liveGw: FplLiveGameweek;
    let result: WhatIfResult | null;

    Given('a live gameweek with a normal starting XI and Salah as captain', () => {
      const scores: Record<number, number> = {};
      for (let i = 1; i <= 11; i++) scores[i] = 5;
      liveGw = makeLive(scores);
      picks = makePicks(null, [
        makePick(1, 1, 2, true),
        ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => makePick(n, n, 1)),
      ]);
    });

    When('I simulate a captain swap from Salah to Salah', () => {
      result = simulateWhatIf(
        picks,
        liveGw,
        EMPTY_BOOTSTRAP,
        { type: 'captain', from: 1, to: 1 },
        PRE_GW_RANK,
        AVG_ENTRY_SCORE,
        55
      );
    });

    Then('the simulation result is null', () => {
      expect(result).toBeNull();
    });
  });

  Scenario(
    'Triple Captain chip uses 3x multiplier for the new captain',
    ({ Given, When, Then }) => {
      let picks: FplEntryGameweekPicks;
      let liveGw: FplLiveGameweek;
      let currentLivePoints: number;
      let result: WhatIfResult | null;

      Given(
        'a live gameweek with Triple Captain chip active where Salah is captain scoring 6 points and Haaland is in the XI scoring 12 points and the remaining 9 each score 2',
        () => {
          const scores: Record<number, number> = { 1: 6, 2: 12 };
          for (let i = 3; i <= 11; i++) scores[i] = 2;
          liveGw = makeLive(scores);
          picks = makePicks('3xc', [
            makePick(1, 1, 3, true),
            makePick(2, 2, 1),
            ...[3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => makePick(n, n, 1)),
          ]);
          currentLivePoints = 6 * 3 + 12 + 9 * 2;
        }
      );

      When('I simulate a captain swap from Salah to Haaland', () => {
        result = simulateWhatIf(
          picks,
          liveGw,
          EMPTY_BOOTSTRAP,
          { type: 'captain', from: 1, to: 2 },
          PRE_GW_RANK,
          AVG_ENTRY_SCORE,
          currentLivePoints
        );
      });

      Then('the simulated total increases by 12 points', () => {
        expect(result).not.toBeNull();
        expect(result?.deltaPoints).toBe(12);
      });
    }
  );

  Scenario('Gameweek not yet started produces zero delta', ({ Given, When, Then }) => {
    let picks: FplEntryGameweekPicks;
    let liveGw: FplLiveGameweek;
    let result: WhatIfResult | null;

    Given('a live gameweek where no player has scored any points yet and Salah is captain', () => {
      const scores: Record<number, number> = {};
      for (let i = 1; i <= 11; i++) scores[i] = 0;
      liveGw = makeLive(scores);
      picks = makePicks(null, [
        makePick(1, 1, 2, true),
        ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => makePick(n, n, 1)),
      ]);
    });

    When(
      'I simulate a captain swap from Salah to a different XI player who also has 0 points',
      () => {
        result = simulateWhatIf(
          picks,
          liveGw,
          EMPTY_BOOTSTRAP,
          { type: 'captain', from: 1, to: 2 },
          PRE_GW_RANK,
          AVG_ENTRY_SCORE,
          0
        );
      }
    );

    Then('the delta points is 0', () => {
      expect(result).not.toBeNull();
      expect(result?.deltaPoints).toBe(0);
    });
  });
});
