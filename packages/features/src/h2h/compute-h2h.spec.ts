import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type {
  FplBootstrapStatic,
  FplEntry,
  FplEntryGameweekPicks,
  FplEntryPick,
  FplLiveGameweek,
} from '@simplyfpl/types';

import { type H2hResult, computeH2h } from './compute-h2h';

const feature = await loadFeature('./compute-h2h.feature');

function makeEntry(id: number): FplEntry {
  return {
    id,
    player_first_name: `Player${id}`,
    player_last_name: 'Test',
    name: `Team ${id}`,
    summary_overall_rank: 100000,
    summary_overall_points: 500,
    summary_event_rank: null,
    summary_event_points: 50,
  };
}

function makePick(
  element: number,
  position: number,
  multiplier: number,
  isCaptain = false,
  isViceCaptain = false
): FplEntryPick {
  return { element, position, multiplier, is_captain: isCaptain, is_vice_captain: isViceCaptain };
}

function makePicks(picks: FplEntryPick[], transferCost = 0): FplEntryGameweekPicks {
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

function makeBootstrap(playerIds: number[]): FplBootstrapStatic {
  return {
    elements: playerIds.map((id) => ({
      id,
      web_name: `Player${id}`,
      first_name: `First${id}`,
      second_name: `Last${id}`,
      team: 1,
      element_type: 3,
      now_cost: 80,
      total_points: 100,
      event_points: 5,
      selected_by_percent: '5.0',
      transfers_in_event: 0,
      transfers_out_event: 0,
      chance_of_playing_next_round: null,
      news: '',
    })),
    teams: [{ id: 1, name: 'Arsenal', short_name: 'ARS', code: 3 }],
    events: [],
    element_types: [
      {
        id: 3,
        plural_name: 'Midfielders',
        plural_name_short: 'MID',
        singular_name: 'Midfielder',
        singular_name_short: 'MID',
      },
    ],
  };
}

function makeStandardXi(startId: number, captainPos = 1, multiplier = 2): FplEntryPick[] {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((pos) =>
    makePick(startId + pos - 1, pos, pos === captainPos ? multiplier : 1, pos === captainPos)
  );
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Score delta is positive when user outscores opponent', ({ Given, When, Then }) => {
    let result: H2hResult;

    Given('two managers where my squad scores 60 points and theirs scores 40 points', () => {});

    When('I compute the H2H result', () => {
      const myPicks = makeStandardXi(1);
      const theirPicks = makeStandardXi(100);
      const scores: Record<number, number> = {};
      for (let i = 0; i < 11; i++) {
        scores[1 + i] = i === 0 ? 10 : 4;
        scores[100 + i] = i === 0 ? 0 : 4;
      }
      result = computeH2h({
        yourEntry: makeEntry(1),
        theirEntry: makeEntry(2),
        yourPicks: makePicks(myPicks),
        theirPicks: makePicks(theirPicks),
        bootstrap: makeBootstrap(
          [...Array(11)].map((_, i) => 1 + i).concat([...Array(11)].map((_, i) => 100 + i))
        ),
        liveGw: makeLive(scores),
      });
    });

    Then('my score delta should be 20', () => {
      expect(result.scoreDelta).toBe(20);
    });
  });

  Scenario(
    'Common picks are identified when both managers share a player',
    ({ Given, When, Then }) => {
      let result: H2hResult;

      Given('two managers who both have player 1 in their starting XI', () => {});

      When('I compute the H2H result', () => {
        const sharedId = 1;
        const myPicks = [
          makePick(sharedId, 1, 2, true),
          ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => makePick(n, n, 1)),
        ];
        const theirPicks = [
          makePick(sharedId, 1, 2, true),
          ...[12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map((n, i) => makePick(n, i + 2, 1)),
        ];
        const allIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
        const scores: Record<number, number> = {};
        allIds.forEach((id) => {
          scores[id] = 5;
        });
        result = computeH2h({
          yourEntry: makeEntry(1),
          theirEntry: makeEntry(2),
          yourPicks: makePicks(myPicks),
          theirPicks: makePicks(theirPicks),
          bootstrap: makeBootstrap(allIds),
          liveGw: makeLive(scores),
        });
      });

      Then('player 1 should appear in the common picks list', () => {
        const commonIds = result.commonPicks.map((p) => p.id);
        expect(commonIds).toContain(1);
      });
    }
  );

  Scenario('Differential players are identified correctly', ({ Given, When, Then }) => {
    let result: H2hResult;

    Given('my squad contains player 99 and the opponent does not', () => {});

    When('I compute the H2H result', () => {
      const myPicks = [
        makePick(99, 1, 2, true),
        ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => makePick(n, n, 1)),
      ];
      const theirPicks = [
        makePick(50, 1, 2, true),
        ...[51, 52, 53, 54, 55, 56, 57, 58, 59, 60].map((n, i) => makePick(n, i + 2, 1)),
      ];
      const allIds = [
        99, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60,
      ];
      const scores: Record<number, number> = {};
      allIds.forEach((id) => {
        scores[id] = 5;
      });
      result = computeH2h({
        yourEntry: makeEntry(1),
        theirEntry: makeEntry(2),
        yourPicks: makePicks(myPicks),
        theirPicks: makePicks(theirPicks),
        bootstrap: makeBootstrap(allIds),
        liveGw: makeLive(scores),
      });
    });

    Then('player 99 should appear in my differential picks', () => {
      const myDiffIds = result.differentialYou.map((p) => p.id);
      expect(myDiffIds).toContain(99);
    });
  });

  Scenario('Transfer cost is deducted from net GW points', ({ Given, When, Then }) => {
    let result: H2hResult;

    Given('my squad scores 50 points with a 4-point transfer hit', () => {});

    When('I compute the H2H result', () => {
      const myPicks = makeStandardXi(1);
      const theirPicks = makeStandardXi(100);
      const allIds = [...Array(11)]
        .map((_, i) => 1 + i)
        .concat([...Array(11)].map((_, i) => 100 + i));
      const scores: Record<number, number> = {};
      allIds.forEach((id) => {
        if (id <= 11) {
          scores[id] = id === 1 ? 5 : 4;
        } else {
          scores[id] = 3;
        }
      });
      result = computeH2h({
        yourEntry: makeEntry(1),
        theirEntry: makeEntry(2),
        yourPicks: makePicks(myPicks, 4),
        theirPicks: makePicks(theirPicks),
        bootstrap: makeBootstrap(allIds),
        liveGw: makeLive(scores),
      });
    });

    Then('my net GW points should be 46', () => {
      expect(result.you.netGwPoints).toBe(46);
    });
  });

  Scenario('Players carry their real team code for kit rendering', ({ Given, When, Then }) => {
    let result: H2hResult;

    Given('two managers whose squads are all Arsenal players', () => {});

    When('I compute the H2H result', () => {
      const myPicks = makeStandardXi(1);
      const theirPicks = makeStandardXi(100);
      const allIds = [...Array(11)]
        .map((_, i) => 1 + i)
        .concat([...Array(11)].map((_, i) => 100 + i));
      const scores: Record<number, number> = {};
      allIds.forEach((id) => {
        scores[id] = 4;
      });
      result = computeH2h({
        yourEntry: makeEntry(1),
        theirEntry: makeEntry(2),
        yourPicks: makePicks(myPicks),
        theirPicks: makePicks(theirPicks),
        bootstrap: makeBootstrap(allIds),
        liveGw: makeLive(scores),
      });
    });

    Then("every player on both sides should carry Arsenal's team code", () => {
      const allPlayers = [
        ...result.you.xi,
        ...result.you.bench,
        ...result.them.xi,
        ...result.them.bench,
      ];
      expect(allPlayers.length).toBeGreaterThan(0);
      for (const player of allPlayers) {
        expect(player.teamCode).toBe(3);
      }
    });
  });
});
