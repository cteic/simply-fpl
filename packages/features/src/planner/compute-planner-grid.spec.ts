import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplEntryPick,
  FplFixture,
} from '@simplyfpl/types';

import { type PlannerGridCell, computePlannerGrid } from './compute-planner-grid';

const feature = await loadFeature('./compute-planner-grid.feature');

function makePick(element: number, position: number): FplEntryPick {
  return { element, position, multiplier: 1, is_captain: false, is_vice_captain: false };
}

function makePicks(elements: number[]): FplEntryGameweekPicks {
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
    picks: elements.map((el, idx) => makePick(el, idx + 1)),
  };
}

function makeBootstrap(gwId: number, isCurrent: boolean, playerIds: number[]): FplBootstrapStatic {
  return {
    elements: playerIds.map((id) => ({
      id,
      web_name: `Player${id}`,
      first_name: `F${id}`,
      second_name: `L${id}`,
      team: 1,
      element_type: 3,
      now_cost: 80,
      total_points: 50,
      event_points: 5,
      selected_by_percent: '5.0',
      transfers_in_event: 0,
      transfers_out_event: 0,
      chance_of_playing_next_round: null,
      news: '',
    })),
    teams: [{ id: 1, name: 'Arsenal', short_name: 'ARS', code: 3 }],
    events: [
      {
        id: gwId,
        name: `Gameweek ${gwId}`,
        deadline_time: '2025-08-15T17:30:00Z',
        is_current: isCurrent,
        is_next: false,
        is_previous: false,
        average_entry_score: 50,
        highest_score: null,
        finished: false,
      },
    ],
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

function makeFixture(event: number, teamH: number, teamA: number, id: number): FplFixture {
  return {
    id,
    event,
    finished: false,
    kickoff_time: '2025-08-15T19:00:00Z',
    team_h: teamH,
    team_a: teamA,
    team_h_score: null,
    team_a_score: null,
    team_h_difficulty: 3,
    team_a_difficulty: 3,
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Grid returns the requested number of gameweeks', ({ Given, When, Then }) => {
    let result: PlannerGridCell[];

    Given('a squad of 11 starters and fixtures for 5 gameweeks from GW1', () => {});

    When('I compute the planner grid starting at GW1 with count 5', () => {
      const playerIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      const fixtures = [1, 2, 3, 4, 5].map((gw) => makeFixture(gw, 1, 2, gw));
      result = computePlannerGrid({
        picks: makePicks(playerIds),
        bootstrap: makeBootstrap(1, false, playerIds),
        fixtures,
        startGameweek: 1,
        count: 5,
      });
    });

    Then('the grid should contain exactly 5 cells', () => {
      expect(result).toHaveLength(5);
    });
  });

  Scenario('Double gameweek cell is labelled correctly', ({ Given, When, Then }) => {
    let result: PlannerGridCell[];

    Given('a starter who has two fixtures in GW1', () => {});

    When('I compute the planner grid starting at GW1 with count 1', () => {
      const playerIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      const fixtures = [makeFixture(1, 1, 2, 1), makeFixture(1, 3, 1, 2)];
      result = computePlannerGrid({
        picks: makePicks(playerIds),
        bootstrap: makeBootstrap(1, false, playerIds),
        fixtures,
        startGameweek: 1,
        count: 1,
      });
    });

    Then('the GW1 cell should be marked as a double gameweek', () => {
      expect(result[0]?.label).toMatch(/DGW/);
    });
  });

  Scenario('Blank gameweek cell is labelled correctly', ({ Given, When, Then }) => {
    let result: PlannerGridCell[];

    Given('a starter who has no fixture in GW1', () => {});

    When('I compute the planner grid starting at GW1 with count 1', () => {
      const playerIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      result = computePlannerGrid({
        picks: makePicks(playerIds),
        bootstrap: makeBootstrap(1, false, playerIds),
        fixtures: [],
        startGameweek: 1,
        count: 1,
      });
    });

    Then('the GW1 cell should be marked as a blank', () => {
      expect(result[0]?.label).toMatch(/Blank/);
    });
  });

  Scenario('Live gameweek label includes the Live indicator', ({ Given, When, Then }) => {
    let result: PlannerGridCell[];

    Given('bootstrap data marking GW2 as current and active', () => {});

    When('I compute the planner grid starting at GW2 with count 1', () => {
      const playerIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      result = computePlannerGrid({
        picks: makePicks(playerIds),
        bootstrap: makeBootstrap(2, true, playerIds),
        fixtures: [makeFixture(2, 1, 2, 1)],
        startGameweek: 2,
        count: 1,
      });
    });

    Then('the GW2 cell label should include Live', () => {
      expect(result[0]?.label).toMatch(/Live/);
    });
  });
});
