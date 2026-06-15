import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplEntryPick,
  FplLiveGameweek,
  FplPlayer,
} from '@simplyfpl/types';

import { applyAutosubs } from './autosubs';

const feature = await loadFeature('./autosubs.feature');

function makePlayer(id: number, elementType: number): FplPlayer {
  return {
    id,
    web_name: `P${id}`,
    first_name: 'Test',
    second_name: `Player ${id}`,
    team: 1,
    element_type: elementType,
    now_cost: 50,
    total_points: 0,
    event_points: 0,
    selected_by_percent: '0',
    transfers_in_event: 0,
    transfers_out_event: 0,
    chance_of_playing_next_round: null,
    news: '',
  };
}

function makePick(
  element: number,
  position: number,
  multiplier: number,
  isCaptain = false
): FplEntryPick {
  return { element, position, multiplier, is_captain: isCaptain, is_vice_captain: false };
}

function makePicks(chip: string | null, picksList: FplEntryPick[]): FplEntryGameweekPicks {
  return {
    active_chip: chip,
    automatic_subs: [],
    entry_history: {
      event: 38,
      points: 0,
      total_points: 0,
      rank: 1,
      rank_sort: 1,
      overall_rank: 1,
      event_transfers: 0,
      event_transfers_cost: 0,
      points_on_bench: 0,
    },
    picks: picksList,
  };
}

function makeLive(minutesById: Record<number, number>): FplLiveGameweek {
  return {
    elements: Object.entries(minutesById).map(([id, minutes]) => ({
      id: Number(id),
      stats: {
        minutes,
        goals_scored: 0,
        assists: 0,
        clean_sheets: 0,
        goals_conceded: 0,
        yellow_cards: 0,
        red_cards: 0,
        saves: 0,
        bonus: 0,
        bps: 0,
        total_points: 0,
        clearances_blocks_interceptions: 0,
        tackles: 0,
      },
      explain: [],
    })),
  };
}

// Standard 4-4-2: 1 GK (id 1), 4 DEF (2-5), 4 MID (6-9), 2 FWD (10-11)
// Bench: GK (12), DEF (13), MID (14), FWD (15)
function standardSquad(): FplEntryPick[] {
  return [
    makePick(1, 1, 1), // GK
    makePick(2, 2, 1), // DEF
    makePick(3, 3, 1),
    makePick(4, 4, 1),
    makePick(5, 5, 1),
    makePick(6, 6, 1), // MID
    makePick(7, 7, 1),
    makePick(8, 8, 1),
    makePick(9, 9, 1),
    makePick(10, 10, 2, true), // FWD captain
    makePick(11, 11, 1),
    makePick(12, 12, 0), // bench GK
    makePick(13, 13, 0), // bench DEF
    makePick(14, 14, 0), // bench MID
    makePick(15, 15, 0), // bench FWD
  ];
}

function standardBootstrap(): FplBootstrapStatic {
  return {
    elements: [
      makePlayer(1, 1),
      makePlayer(2, 2),
      makePlayer(3, 2),
      makePlayer(4, 2),
      makePlayer(5, 2),
      makePlayer(6, 3),
      makePlayer(7, 3),
      makePlayer(8, 3),
      makePlayer(9, 3),
      makePlayer(10, 4),
      makePlayer(11, 4),
      makePlayer(12, 1), // bench GK
      makePlayer(13, 2), // bench DEF
      makePlayer(14, 3), // bench MID
      makePlayer(15, 4), // bench FWD
    ],
    teams: [],
    events: [],
    element_types: [],
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'A 0-min starter is replaced by an eligible bench player',
    ({ Given, When, Then, And }) => {
      let picks: FplEntryGameweekPicks;
      let live: FplLiveGameweek;
      const bootstrap = standardBootstrap();
      let result: FplEntryGameweekPicks;

      Given('a squad with a 0-min midfielder starting and a 60-min midfielder on the bench', () => {
        picks = makePicks(null, standardSquad());
        const minutes: Record<number, number> = {};
        for (let i = 1; i <= 15; i++) minutes[i] = 90;
        minutes[6] = 0; // starting MID id 6 plays 0
        minutes[12] = 0; // bench GK skipped (GK→MID swap invalid anyway)
        minutes[13] = 0; // bench DEF unavailable (would have been picked by priority order)
        minutes[14] = 60; // bench MID id 14 plays 60 → chosen
        live = makeLive(minutes);
      });

      When('I apply autosubs', () => {
        result = applyAutosubs(picks, live, bootstrap);
      });

      Then('the bench midfielder is promoted to the starting XI', () => {
        const sub = result.picks.find((p) => p.element === 14);
        expect(sub?.position).toBe(6);
        expect(sub?.multiplier).toBe(1);
      });

      And('the 0-min starter is moved to the bench', () => {
        const benched = result.picks.find((p) => p.element === 6);
        expect(benched?.position).toBe(14);
        expect(benched?.multiplier).toBe(0);
      });
    }
  );

  Scenario('No eligible bench player means no substitution', ({ Given, When, Then }) => {
    let picks: FplEntryGameweekPicks;
    let live: FplLiveGameweek;
    const bootstrap = standardBootstrap();
    let result: FplEntryGameweekPicks;

    Given(
      'a squad with a 0-min midfielder starting and no bench players who played minutes',
      () => {
        picks = makePicks(null, standardSquad());
        const minutes: Record<number, number> = {};
        for (let i = 1; i <= 11; i++) minutes[i] = 90;
        minutes[6] = 0;
        minutes[12] = 0;
        minutes[13] = 0;
        minutes[14] = 0;
        minutes[15] = 0;
        live = makeLive(minutes);
      }
    );

    When('I apply autosubs', () => {
      result = applyAutosubs(picks, live, bootstrap);
    });

    Then('the starting XI is unchanged', () => {
      const starterIds = result.picks
        .filter((p) => p.position <= 11)
        .map((p) => p.element)
        .sort((a, b) => a - b);
      expect(starterIds).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    });
  });

  Scenario(
    'A 0-min goalkeeper is swapped only for the bench goalkeeper',
    ({ Given, When, Then }) => {
      let picks: FplEntryGameweekPicks;
      let live: FplLiveGameweek;
      const bootstrap = standardBootstrap();
      let result: FplEntryGameweekPicks;

      Given('a squad with a 0-min starting goalkeeper and a 90-min bench goalkeeper', () => {
        picks = makePicks(null, standardSquad());
        const minutes: Record<number, number> = {};
        for (let i = 1; i <= 15; i++) minutes[i] = 90;
        minutes[1] = 0; // starting GK plays 0
        live = makeLive(minutes);
      });

      When('I apply autosubs', () => {
        result = applyAutosubs(picks, live, bootstrap);
      });

      Then('the bench goalkeeper is promoted to the starting XI', () => {
        const sub = result.picks.find((p) => p.element === 12);
        expect(sub?.position).toBe(1);
        const dropped = result.picks.find((p) => p.element === 1);
        expect(dropped?.position).toBe(12);
      });
    }
  );

  Scenario('A formation-invalid bench candidate is skipped', ({ Given, And, When, Then }) => {
    let picks: FplEntryGameweekPicks;
    let live: FplLiveGameweek;
    let bootstrap: FplBootstrapStatic;
    let result: FplEntryGameweekPicks;

    Given('a squad whose starting XI already has 3 defenders and a 0-min defender', () => {
      // 3-5-2 formation: 1 GK, 3 DEF (2,3,4), 5 MID (5,6,7,8,9), 2 FWD (10,11)
      // Bench: GK (12), MID (13), MID (14), FWD (15) — no DEF on bench.
      const squad: FplEntryPick[] = [
        makePick(1, 1, 1),
        makePick(2, 2, 1),
        makePick(3, 3, 1),
        makePick(4, 4, 1),
        makePick(5, 5, 1),
        makePick(6, 6, 1),
        makePick(7, 7, 1),
        makePick(8, 8, 1),
        makePick(9, 9, 1),
        makePick(10, 10, 2, true),
        makePick(11, 11, 1),
        makePick(12, 12, 0),
        makePick(13, 13, 0),
        makePick(14, 14, 0),
        makePick(15, 15, 0),
      ];
      bootstrap = {
        elements: [
          makePlayer(1, 1), // GK
          makePlayer(2, 2), // DEF
          makePlayer(3, 2),
          makePlayer(4, 2),
          makePlayer(5, 3), // MID
          makePlayer(6, 3),
          makePlayer(7, 3),
          makePlayer(8, 3),
          makePlayer(9, 3),
          makePlayer(10, 4), // FWD
          makePlayer(11, 4),
          makePlayer(12, 1), // bench GK
          makePlayer(13, 3), // bench MID
          makePlayer(14, 3), // bench MID
          makePlayer(15, 4), // bench FWD
        ],
        teams: [],
        events: [],
        element_types: [],
      };
      picks = makePicks(null, squad);
    });

    And('the only candidate bench player is a forward that would break the formation', () => {
      const minutes: Record<number, number> = {};
      for (let i = 1; i <= 15; i++) minutes[i] = 90;
      minutes[2] = 0; // 0-min DEF — only fwd id 15 has minutes among "viable" testers
      minutes[13] = 0;
      minutes[14] = 0;
      live = makeLive(minutes);
    });

    When('I apply autosubs', () => {
      result = applyAutosubs(picks, live, bootstrap);
    });

    Then('the starting XI is unchanged', () => {
      // DEF id 2 stays starting because bench fwd id 15 would leave us with
      // 2 DEF and 3 FWD (invalid).
      const starterIds = result.picks
        .filter((p) => p.position <= 11)
        .map((p) => p.element)
        .sort((a, b) => a - b);
      expect(starterIds).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    });
  });

  Scenario('Bench Boost suppresses autosubs entirely', ({ Given, When, Then }) => {
    let picks: FplEntryGameweekPicks;
    let live: FplLiveGameweek;
    const bootstrap = standardBootstrap();
    let result: FplEntryGameweekPicks;

    Given('a squad with Bench Boost active and a 0-min starter', () => {
      picks = makePicks('bboost', standardSquad());
      const minutes: Record<number, number> = {};
      for (let i = 1; i <= 15; i++) minutes[i] = 90;
      minutes[6] = 0;
      live = makeLive(minutes);
    });

    When('I apply autosubs', () => {
      result = applyAutosubs(picks, live, bootstrap);
    });

    Then('the picks are returned unchanged', () => {
      expect(result).toBe(picks);
    });
  });
});
