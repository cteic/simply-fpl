import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplLiveElement,
  FplLiveGameweek,
  FplPlayer,
  LiveSquadEvent,
} from '@simplyfpl/types';

import { diffLiveSquadEvents } from './live-events';

const feature = await loadFeature('./live-events.feature');

function live(id: number, stats: Partial<FplLiveElement['stats']> = {}): FplLiveElement {
  return {
    id,
    stats: {
      minutes: 60,
      goals_scored: 0,
      assists: 0,
      clean_sheets: 0,
      goals_conceded: 0,
      yellow_cards: 0,
      red_cards: 0,
      saves: 0,
      bonus: 0,
      bps: 0,
      total_points: 2,
      clearances_blocks_interceptions: 0,
      tackles: 0,
      ...stats,
    },
    explain: [],
  };
}

function feed(...elements: FplLiveElement[]): FplLiveGameweek {
  return { elements };
}

function player(id: number, webName: string): FplPlayer {
  return {
    id,
    web_name: webName,
    first_name: '',
    second_name: '',
    team: 1,
    element_type: 3,
    now_cost: 60,
    total_points: 0,
    event_points: 0,
    selected_by_percent: '10.0',
    transfers_in_event: 0,
    transfers_out_event: 0,
    chance_of_playing_next_round: null,
    news: '',
  };
}

const bootstrap: FplBootstrapStatic = {
  elements: [player(1, 'Palmer'), player(2, 'Haaland'), player(3, 'Benchy'), player(9, 'Other')],
  teams: [],
  events: [],
  element_types: [],
};

function picks(chip: string | null = null): FplEntryGameweekPicks {
  return {
    active_chip: chip,
    automatic_subs: [],
    entry_history: {
      event: 12,
      points: 0,
      total_points: 0,
      rank: 0,
      rank_sort: 0,
      overall_rank: 0,
      event_transfers: 0,
      event_transfers_cost: 0,
      points_on_bench: 0,
    },
    picks: [
      { element: 1, position: 1, multiplier: 1, is_captain: false, is_vice_captain: false },
      { element: 2, position: 2, multiplier: 2, is_captain: true, is_vice_captain: false },
      {
        element: 3,
        position: 12,
        multiplier: chip === 'bboost' ? 1 : 0,
        is_captain: false,
        is_vice_captain: false,
      },
    ],
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Opening the app mid-gameweek replays nothing', ({ Given, When, Then }) => {
    let events: LiveSquadEvent[];

    Given('a live feed with no earlier snapshot to compare against', () => {
      events = [];
    });

    When('I diff the squad events', () => {
      events = diffLiveSquadEvents({
        previous: undefined,
        next: feed(live(1, { goals_scored: 2, total_points: 12 })),
        picks: picks(),
        bootstrap,
      });
    });

    Then('there are no events', () => {
      expect(events).toHaveLength(0);
    });
  });

  Scenario(
    'A goal by a starter is reported with the points it earned',
    ({ Given, When, Then, And }) => {
      let events: LiveSquadEvent[];

      Given('a starter who has scored since the last refresh', () => {
        events = [];
      });

      When('I diff the squad events', () => {
        events = diffLiveSquadEvents({
          previous: feed(live(1)),
          next: feed(live(1, { goals_scored: 1, total_points: 7 })),
          picks: picks(),
          bootstrap,
        });
      });

      Then('one goal event names that player', () => {
        expect(events).toHaveLength(1);
        expect(events[0]?.kind).toBe('goal');
        expect(events[0]?.playerName).toBe('Palmer');
      });

      And('it carries the points the manager gained', () => {
        expect(events[0]?.pointsDelta).toBe(5);
      });
    }
  );

  Scenario("The captain's points are doubled", ({ Given, When, Then, And }) => {
    let events: LiveSquadEvent[];

    Given('the captain has scored since the last refresh', () => {
      events = [];
    });

    When('I diff the squad events', () => {
      events = diffLiveSquadEvents({
        previous: feed(live(2)),
        next: feed(live(2, { goals_scored: 1, total_points: 6 })),
        picks: picks(),
        bootstrap,
      });
    });

    Then('the event is marked as the captain', () => {
      expect(events[0]?.isCaptain).toBe(true);
    });

    And('the points gained are doubled', () => {
      expect(events[0]?.pointsDelta).toBe(8);
    });
  });

  Scenario(
    "A benched player's goal is reported but earns nothing",
    ({ Given, When, Then, And }) => {
      let events: LiveSquadEvent[];

      Given('a benched player who has scored since the last refresh', () => {
        events = [];
      });

      When('I diff the squad events', () => {
        events = diffLiveSquadEvents({
          previous: feed(live(3)),
          next: feed(live(3, { goals_scored: 1, total_points: 7 })),
          picks: picks(),
          bootstrap,
        });
      });

      Then('the event is marked as on the bench', () => {
        expect(events[0]?.onBench).toBe(true);
      });

      And('it carries no points', () => {
        expect(events[0]?.pointsDelta).toBe(0);
      });
    }
  );

  Scenario('Bench boost makes a benched player count', ({ Given, When, Then, And }) => {
    let events: LiveSquadEvent[];

    Given('a benched player who has scored while bench boost is active', () => {
      events = [];
    });

    When('I diff the squad events', () => {
      events = diffLiveSquadEvents({
        previous: feed(live(3)),
        next: feed(live(3, { goals_scored: 1, total_points: 7 })),
        picks: picks('bboost'),
        bootstrap,
      });
    });

    Then('the event is not marked as on the bench', () => {
      expect(events[0]?.onBench).toBe(false);
    });

    And('it carries the points the manager gained', () => {
      expect(events[0]?.pointsDelta).toBe(5);
    });
  });

  Scenario('A goal and bonus in one refresh do not double count', ({ Given, When, Then, And }) => {
    let events: LiveSquadEvent[];

    Given('a starter who gained a goal and two bonus since the last refresh', () => {
      events = [];
    });

    When('I diff the squad events', () => {
      events = diffLiveSquadEvents({
        previous: feed(live(1)),
        next: feed(live(1, { goals_scored: 1, bonus: 2, total_points: 9 })),
        picks: picks(),
        bootstrap,
      });
    });

    Then('three events are reported for that player', () => {
      expect(events.map((e) => e.kind).sort()).toEqual(['bonus', 'bonus', 'goal']);
      expect(new Set(events.map((e) => e.id)).size).toBe(3);
    });

    And('the points gained are counted once across them', () => {
      expect(events.reduce((sum, e) => sum + e.pointsDelta, 0)).toBe(7);
    });
  });

  Scenario('A revoked clean sheet is reported as a loss', ({ Given, When, Then }) => {
    let events: LiveSquadEvent[];

    Given('a defender whose clean sheet has been taken away', () => {
      events = [];
    });

    When('I diff the squad events', () => {
      events = diffLiveSquadEvents({
        previous: feed(live(1, { clean_sheets: 1, total_points: 6 })),
        next: feed(live(1, { clean_sheets: 0, goals_conceded: 1, total_points: 2 })),
        picks: picks(),
        bootstrap,
      });
    });

    Then('a lost clean sheet event is reported with negative points', () => {
      expect(events).toHaveLength(1);
      expect(events[0]?.kind).toBe('clean_sheet_lost');
      expect(events[0]?.pointsDelta).toBe(-4);
    });
  });

  Scenario('A player outside the squad is ignored', ({ Given, When, Then }) => {
    let events: LiveSquadEvent[];

    Given('a player the manager does not own has scored', () => {
      events = [];
    });

    When('I diff the squad events', () => {
      events = diffLiveSquadEvents({
        previous: feed(live(9)),
        next: feed(live(9, { goals_scored: 1, total_points: 7 })),
        picks: picks(),
        bootstrap,
      });
    });

    Then('there are no events', () => {
      expect(events).toHaveLength(0);
    });
  });
});
