import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplFixture,
  FplLiveGameweek,
  FplPlayer,
  FplTeam,
} from '@simplyfpl/types';

import { type LiveBattle, computeLiveBattle } from './compute-live-battle';

const feature = await loadFeature('./compute-live-battle.feature');

function makePlayer(id: number, team: number, ownershipPct: number): FplPlayer {
  return {
    id,
    web_name: `Player${id}`,
    first_name: `First${id}`,
    second_name: `Last${id}`,
    team,
    element_type: 3,
    now_cost: 80,
    total_points: 0,
    event_points: 0,
    selected_by_percent: ownershipPct.toFixed(1),
    transfers_in_event: 0,
    transfers_out_event: 0,
    chance_of_playing_next_round: null,
    news: '',
  };
}

function makeTeams(ids: number[]): FplTeam[] {
  return ids.map((id) => ({ id, name: `Team${id}`, short_name: `T${id}`, code: id }));
}

function makeBootstrap(players: FplPlayer[], teamIds: number[]): FplBootstrapStatic {
  return { elements: players, teams: makeTeams(teamIds), events: [], element_types: [] };
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

function makeFixture(
  id: number,
  teamH: number,
  teamA: number,
  started: boolean,
  finished: boolean
): FplFixture {
  return {
    id,
    event: 1,
    started,
    finished,
    finished_provisional: false,
    kickoff_time: null,
    team_h: teamH,
    team_a: teamA,
    team_h_score: null,
    team_a_score: null,
    team_h_difficulty: 3,
    team_a_difficulty: 3,
  };
}

function makePicks(owned: Array<{ element: number; isCaptain?: boolean }>): FplEntryGameweekPicks {
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
    picks: owned.map((o, i) => ({
      element: o.element,
      position: i + 1,
      multiplier: o.isCaptain ? 2 : 1,
      is_captain: o.isCaptain ?? false,
      is_vice_captain: false,
    })),
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('An owned low-ownership hauler is a large gain', ({ Given, And, When, Then }) => {
    let battle: LiveBattle;

    Given('a fixture for team 1 is in progress', () => {});
    And(
      'you own player 10 who is owned by 5% of the field and has scored 12 live points',
      () => {}
    );

    When('I compute the live battle', () => {
      const players = [makePlayer(10, 1, 5)];
      battle = computeLiveBattle({
        yourPicks: makePicks([{ element: 10 }]),
        bootstrap: makeBootstrap(players, [1]),
        liveGw: makeLive({ 10: 12 }),
        fixtures: [makeFixture(1, 1, 2, true, false)],
      });
    });

    Then('player 10 should be in the gains column', () => {
      expect(battle.gains.map((p) => p.elementId)).toContain(10);
    });
    And('player 10 should have a positive rank impact', () => {
      const row = battle.gains.find((p) => p.elementId === 10);
      expect(row?.rankImpact).toBeGreaterThan(0);
    });
  });

  Scenario('An unowned high-ownership hauler is a large loss', ({ Given, And, When, Then }) => {
    let battle: LiveBattle;

    Given('a fixture for team 1 is in progress', () => {});
    And(
      'you do not own player 20 who is owned by 80% of the field and has scored 12 live points',
      () => {}
    );

    When('I compute the live battle', () => {
      const players = [makePlayer(20, 1, 80)];
      battle = computeLiveBattle({
        yourPicks: makePicks([]),
        bootstrap: makeBootstrap(players, [1]),
        liveGw: makeLive({ 20: 12 }),
        fixtures: [makeFixture(1, 1, 2, true, false)],
      });
    });

    Then('player 20 should be in the losses column', () => {
      expect(battle.losses.map((p) => p.elementId)).toContain(20);
    });
    And('player 20 should have a negative rank impact', () => {
      const row = battle.losses.find((p) => p.elementId === 20);
      expect(row?.rankImpact).toBeLessThan(0);
    });
  });

  Scenario(
    'An owned differential outweighs an owned template player',
    ({ Given, And, When, Then }) => {
      let battle: LiveBattle;

      Given('a fixture for team 1 is in progress', () => {});
      And('you own player 10 owned by 5% of the field who has scored 10 live points', () => {});
      And('you own player 30 owned by 90% of the field who has scored 10 live points', () => {});

      When('I compute the live battle', () => {
        const players = [makePlayer(10, 1, 5), makePlayer(30, 1, 90)];
        battle = computeLiveBattle({
          yourPicks: makePicks([{ element: 10 }, { element: 30 }]),
          bootstrap: makeBootstrap(players, [1]),
          liveGw: makeLive({ 10: 10, 30: 10 }),
          fixtures: [makeFixture(1, 1, 2, true, false)],
        });
      });

      Then('player 10 should rank above player 30 in the gains column', () => {
        const ids = battle.gains.map((p) => p.elementId);
        const idx10 = ids.indexOf(10);
        const idx30 = ids.indexOf(30);
        expect(idx10).toBeGreaterThanOrEqual(0);
        expect(idx30).toBeGreaterThanOrEqual(0);
        expect(idx10).toBeLessThan(idx30);
      });
    }
  );

  Scenario('A player not in a live fixture is excluded', ({ Given, And, When, Then }) => {
    let battle: LiveBattle;

    Given('a fixture for team 1 is in progress', () => {});
    And('team 2 has no fixture in progress', () => {});
    And('you own player 40 on team 2 who has scored 12 live points', () => {});

    When('I compute the live battle', () => {
      const players = [makePlayer(11, 1, 10), makePlayer(40, 2, 10)];
      battle = computeLiveBattle({
        yourPicks: makePicks([{ element: 40 }]),
        bootstrap: makeBootstrap(players, [1, 2, 3]),
        liveGw: makeLive({ 11: 6, 40: 12 }),
        fixtures: [makeFixture(1, 1, 3, true, false), makeFixture(2, 2, 3, false, false)],
      });
    });

    Then('player 40 should not appear in the live battle', () => {
      const ids = [...battle.gains, ...battle.losses].map((p) => p.elementId);
      expect(ids).not.toContain(40);
    });
  });

  Scenario('No in-progress fixtures means the battle is not live', ({ Given, And, When, Then }) => {
    let battle: LiveBattle;

    Given('no fixtures are in progress', () => {});

    When('I compute the live battle', () => {
      const players = [makePlayer(10, 1, 5)];
      battle = computeLiveBattle({
        yourPicks: makePicks([{ element: 10 }]),
        bootstrap: makeBootstrap(players, [1, 2]),
        liveGw: makeLive({ 10: 12 }),
        fixtures: [makeFixture(1, 1, 2, false, false), makeFixture(2, 1, 2, true, true)],
      });
    });

    Then('the live battle should not be live', () => {
      expect(battle.isLive).toBe(false);
    });
    And('the gains and losses columns should be empty', () => {
      expect(battle.gains).toEqual([]);
      expect(battle.losses).toEqual([]);
    });
  });

  Scenario(
    "Each battle row exposes the player's live points for the PTS column",
    ({ Given, And, When, Then }) => {
      let battle: LiveBattle;

      Given('a fixture for team 1 is in progress', () => {});
      And(
        'you own player 10 who is owned by 5% of the field and has scored 12 live points',
        () => {}
      );

      When('I compute the live battle', () => {
        const players = [makePlayer(10, 1, 5)];
        battle = computeLiveBattle({
          yourPicks: makePicks([{ element: 10 }]),
          bootstrap: makeBootstrap(players, [1]),
          liveGw: makeLive({ 10: 12 }),
          fixtures: [makeFixture(1, 1, 2, true, false)],
        });
      });

      Then('player 10 should report 12 live points', () => {
        const row = battle.gains.find((p) => p.elementId === 10);
        expect(row?.livePoints).toBe(12);
      });
    }
  );
});
