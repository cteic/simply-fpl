import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplEntryPick,
  FplLiveGameweek,
} from '@simplyfpl/types';

import type { CohortSnapshotPayload } from '../cohorts/types';
import { type Threat, computeThreats } from './compute-threats';

const feature = await loadFeature('./compute-threats.feature');

function picksToAggregate(cohortPicks: FplEntryGameweekPicks[]): CohortSnapshotPayload {
  const startingCounts = new Map<number, number>();
  const captainCounts = new Map<number, number>();
  for (const picks of cohortPicks) {
    for (const pick of picks.picks) {
      if (pick.position <= 11) {
        startingCounts.set(pick.element, (startingCounts.get(pick.element) ?? 0) + 1);
      }
      if (pick.is_captain) {
        captainCounts.set(pick.element, (captainCounts.get(pick.element) ?? 0) + 1);
      }
    }
  }
  return {
    captains: [...captainCounts].map(([player_id, count]) => ({ player_id, count })),
    ownership: [...startingCounts].map(([player_id, starting_count]) => ({
      player_id,
      starting_count,
      bench_count: 0,
    })),
    transfers_in: [],
    transfers_out: [],
    chips: {},
    entries_sampled: cohortPicks.length,
    avg_event_points: 0,
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

function makePicks(picks: FplEntryPick[]): FplEntryGameweekPicks {
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

function makeStandardXi(startId: number): FplEntryPick[] {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((pos) =>
    makePick(startId + pos - 1, pos, pos === 1 ? 2 : 1, pos === 1)
  );
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
        clearances_blocks_interceptions: 0,
        tackles: 0,
      },
      explain: [],
    })),
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Players the user already owns are excluded from threats', ({ Given, When, Then }) => {
    let threats: Threat[];

    Given('the user owns player 1 and the cohort also has player 1 in their squads', () => {});

    When('I compute the threats', () => {
      const yourPicks = makePicks(makeStandardXi(1));
      const cohortPicks = [makePicks(makeStandardXi(1))];
      const allIds = [...Array(11)].map((_, i) => 1 + i);
      const scores: Record<number, number> = {};
      for (const id of allIds) scores[id] = 5;
      threats = computeThreats({
        yourPicks,
        cohort: picksToAggregate(cohortPicks),
        bootstrap: makeBootstrap(allIds),
        liveGw: makeLive(scores),
        fixtures: [],
      });
    });

    Then('player 1 should not appear in the threat list', () => {
      expect(threats.map((t) => t.elementId)).not.toContain(1);
    });
  });

  Scenario('Threats are ranked by projected rank impact', ({ Given, When, Then }) => {
    let threats: Threat[];

    Given('the cohort owns player 50 at 80% and player 60 at 20%', () => {});

    When('I compute the threats', () => {
      const yourPicks = makePicks(makeStandardXi(100));
      const cohort: FplEntryGameweekPicks[] = [];
      const popularPicks = [
        makePick(50, 1, 2, true),
        ...[60, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n, i) => makePick(n, i + 2, 1)),
      ];
      const lesserPicks = [
        makePick(50, 1, 2, true),
        ...[70, 71, 72, 73, 74, 75, 76, 77, 78, 79].map((n, i) => makePick(n, i + 2, 1)),
      ];
      for (let i = 0; i < 8; i++) cohort.push(makePicks(popularPicks));
      for (let i = 0; i < 2; i++) cohort.push(makePicks(lesserPicks));

      const allIds = [
        50, 60, 2, 3, 4, 5, 6, 7, 8, 9, 10, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 100, 101, 102,
        103, 104, 105, 106, 107, 108, 109, 110,
      ];
      const scores: Record<number, number> = {};
      for (const id of allIds) scores[id] = 4;

      threats = computeThreats({
        yourPicks,
        cohort: picksToAggregate(cohort),
        bootstrap: makeBootstrap(allIds),
        liveGw: makeLive(scores),
        fixtures: [],
      });
    });

    Then('player 50 should appear before player 60 in the threat list', () => {
      const ids = threats.map((t) => t.elementId);
      const idx50 = ids.indexOf(50);
      const idx60 = ids.indexOf(60);
      expect(idx50).toBeGreaterThanOrEqual(0);
      expect(idx60).toBeGreaterThanOrEqual(0);
      expect(idx50).toBeLessThan(idx60);
    });
  });

  Scenario('Empty cohort returns no threats', ({ Given, When, Then }) => {
    let threats: Threat[];

    Given('the cohort has no managers', () => {});

    When('I compute the threats', () => {
      const yourPicks = makePicks(makeStandardXi(1));
      const allIds = [...Array(11)].map((_, i) => 1 + i);
      const scores: Record<number, number> = {};
      for (const id of allIds) scores[id] = 5;
      threats = computeThreats({
        yourPicks,
        cohort: picksToAggregate([]),
        bootstrap: makeBootstrap(allIds),
        liveGw: makeLive(scores),
        fixtures: [],
      });
    });

    Then('the threat list should be empty', () => {
      expect(threats).toEqual([]);
    });
  });
});
