import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplFixture,
  FplLiveGameweek,
} from '@simplyfpl/types';

import type { CohortSnapshotPayload } from '../cohorts/types';
import { type Threat, computeThreats, filterThreatsByStatus } from './compute-threats';

const feature = await loadFeature('./playing-status.feature');

const NOW = Date.parse('2026-05-24T15:00:00Z');

type FixtureState = 'in-progress' | 'finished' | 'to-play';

const KICKOFF_BY_STATE: Record<FixtureState, string> = {
  'in-progress': '2026-05-24T14:00:00Z',
  finished: '2026-05-24T12:00:00Z',
  'to-play': '2026-05-24T18:00:00Z',
};

interface PlayerSpec {
  id: number;
  team: number;
  minutes: number;
  points: number;
  state: FixtureState;
  ownedByCount: number;
}

function makeBootstrap(specs: PlayerSpec[]): FplBootstrapStatic {
  const teamIds = [...new Set(specs.map((s) => s.team))];
  return {
    elements: specs.map((spec) => ({
      id: spec.id,
      web_name: `Player${spec.id}`,
      first_name: `First${spec.id}`,
      second_name: `Last${spec.id}`,
      team: spec.team,
      element_type: 3,
      now_cost: 80,
      total_points: 100,
      event_points: spec.points,
      selected_by_percent: '5.0',
      transfers_in_event: 0,
      transfers_out_event: 0,
      chance_of_playing_next_round: null,
      news: '',
    })),
    teams: teamIds.map((id) => ({
      id,
      name: `Team${id}`,
      short_name: `T${id}`,
      code: id,
    })),
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

function makeLive(specs: PlayerSpec[]): FplLiveGameweek {
  return {
    elements: specs.map((spec) => ({
      id: spec.id,
      stats: {
        minutes: spec.minutes,
        goals_scored: 0,
        assists: 0,
        clean_sheets: 0,
        goals_conceded: 0,
        yellow_cards: 0,
        red_cards: 0,
        saves: 0,
        bonus: 0,
        bps: 0,
        total_points: spec.points,
        clearances_blocks_interceptions: 0,
        tackles: 0,
      },
      explain: [],
    })),
  };
}

function makeFixtures(specs: PlayerSpec[]): FplFixture[] {
  return specs.map((spec, idx) => ({
    id: idx + 1,
    event: 1,
    finished: spec.state === 'finished',
    finished_provisional: spec.state === 'finished',
    kickoff_time: KICKOFF_BY_STATE[spec.state],
    team_h: spec.team,
    team_a: 99,
    team_h_score: null,
    team_a_score: null,
    team_h_difficulty: 3,
    team_a_difficulty: 3,
  }));
}

function makeCohort(
  specs: PlayerSpec[],
  entriesSampled: number,
  avgEventPoints: number
): CohortSnapshotPayload {
  return {
    captains: [],
    ownership: specs.map((spec) => ({
      player_id: spec.id,
      starting_count: spec.ownedByCount,
      bench_count: 0,
    })),
    transfers_in: [],
    transfers_out: [],
    chips: {},
    entries_sampled: entriesSampled,
    avg_event_points: avgEventPoints,
  };
}

function makeYourPicks(): FplEntryGameweekPicks {
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
    picks: [900].map((element, i) => ({
      element,
      position: i + 1,
      multiplier: 1,
      is_captain: false,
      is_vice_captain: false,
    })),
  };
}

function compute(specs: PlayerSpec[], entriesSampled: number, avgEventPoints = 50): Threat[] {
  return computeThreats({
    yourPicks: makeYourPicks(),
    cohort: makeCohort(specs, entriesSampled, avgEventPoints),
    bootstrap: makeBootstrap(specs),
    liveGw: makeLive(specs),
    fixtures: makeFixtures(specs),
    nowMs: NOW,
  });
}

function statusOf(threats: Threat[], elementId: number): string {
  const match = threats.find((t) => t.elementId === elementId);
  if (!match) throw new Error(`threat ${elementId} not found`);
  return match.playingStatus;
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('A player in an in-progress fixture is Playing', ({ Given, When, Then, And }) => {
    let threats: Threat[];
    const spec: PlayerSpec = {
      id: 10,
      team: 1,
      minutes: 30,
      points: 4,
      state: 'in-progress',
      ownedByCount: 5,
    };

    Given('a threat whose team is in a fixture that has kicked off but not finished', () => {});
    When('I compute the threats', () => {
      threats = compute([spec], 10);
    });
    Then('that threat\'s playing status should be "playing"', () => {
      expect(statusOf(threats, 10)).toBe('playing');
    });
    And('the "Playing" filter should include that threat', () => {
      expect(filterThreatsByStatus(threats, 'playing').map((t) => t.elementId)).toContain(10);
    });
  });

  Scenario(
    "A player in a finished fixture with no minutes Didn't Play",
    ({ Given, When, Then, And }) => {
      let threats: Threat[];
      const spec: PlayerSpec = {
        id: 11,
        team: 2,
        minutes: 0,
        points: 0,
        state: 'finished',
        ownedByCount: 5,
      };

      Given("a threat whose team's fixture has finished and the player logged 0 minutes", () => {});
      When('I compute the threats', () => {
        threats = compute([spec], 10);
      });
      Then('that threat\'s playing status should be "didnt-play"', () => {
        expect(statusOf(threats, 11)).toBe('didnt-play');
      });
      And('the "Didn\'t Play" filter should include that threat', () => {
        expect(filterThreatsByStatus(threats, 'didnt-play').map((t) => t.elementId)).toContain(11);
      });
    }
  );

  Scenario('A player in a finished fixture with minutes has Played', ({ Given, When, Then }) => {
    let threats: Threat[];
    const spec: PlayerSpec = {
      id: 12,
      team: 3,
      minutes: 90,
      points: 6,
      state: 'finished',
      ownedByCount: 5,
    };

    Given("a threat whose team's fixture has finished and the player logged minutes", () => {});
    When('I compute the threats', () => {
      threats = compute([spec], 10);
    });
    Then('that threat\'s playing status should be "played"', () => {
      expect(statusOf(threats, 12)).toBe('played');
    });
  });

  Scenario('A player whose fixture has not started is To Play', ({ Given, When, Then }) => {
    let threats: Threat[];
    const spec: PlayerSpec = {
      id: 13,
      team: 4,
      minutes: 0,
      points: 0,
      state: 'to-play',
      ownedByCount: 5,
    };

    Given("a threat whose team's fixture has not kicked off yet", () => {});
    When('I compute the threats', () => {
      threats = compute([spec], 10);
    });
    Then('that threat\'s playing status should be "to-play"', () => {
      expect(statusOf(threats, 13)).toBe('to-play');
    });
  });

  Scenario('The All filter shows every threat regardless of status', ({ Given, When, Then }) => {
    let threats: Threat[];
    const specs: PlayerSpec[] = [
      { id: 20, team: 1, minutes: 30, points: 4, state: 'in-progress', ownedByCount: 5 },
      { id: 21, team: 2, minutes: 0, points: 0, state: 'finished', ownedByCount: 5 },
      { id: 22, team: 3, minutes: 0, points: 0, state: 'to-play', ownedByCount: 5 },
    ];

    Given('threats with a mix of playing statuses', () => {});
    When('I compute the threats', () => {
      threats = compute(specs, 10);
    });
    Then('the "All" filter should include every threat', () => {
      expect(filterThreatsByStatus(threats, 'all')).toHaveLength(threats.length);
      expect(
        filterThreatsByStatus(threats, 'all')
          .map((t) => t.elementId)
          .sort()
      ).toEqual([20, 21, 22]);
    });
  });

  Scenario(
    'Points lost to a threat reflect effective ownership and live points',
    ({ Given, When, Then, And }) => {
      let threats: Threat[];
      const spec: PlayerSpec = {
        id: 30,
        team: 1,
        minutes: 90,
        points: 9,
        state: 'finished',
        ownedByCount: 10,
      };

      Given('a threat owned by the whole cohort that has scored points this gameweek', () => {});
      When('I compute the threats', () => {
        threats = compute([spec], 10, 60);
      });
      Then(
        'the points lost to that threat should equal effective ownership times live points',
        () => {
          const threat = threats.find((t) => t.elementId === 30);
          expect(threat).toBeDefined();
          if (!threat) return;
          expect(threat.effectiveOwnershipPct).toBeCloseTo(100);
          expect(threat.pointsLostToThreat).toBeCloseTo(9);
        }
      );
      And("the score percentage should be the player's share of the cohort average", () => {
        const threat = threats.find((t) => t.elementId === 30);
        expect(threat?.scorePct).toBeCloseTo(15);
      });
    }
  );
});
