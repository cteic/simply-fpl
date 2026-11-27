import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplLiveGameweek,
  FplPlayer,
} from '@simplyfpl/types';

import type { CohortSnapshotPayload } from '../cohorts/types';
import { resolveThreats, type ResolvedThreats } from './resolve-threats';

const feature = await loadFeature('./resolve-threats.feature');

function player(id: number, webName: string, ownership: string): FplPlayer {
  return {
    id,
    web_name: webName,
    first_name: '',
    second_name: '',
    team: 1,
    element_type: 4,
    now_cost: 100,
    total_points: 0,
    event_points: 0,
    selected_by_percent: ownership,
    transfers_in_event: 0,
    transfers_out_event: 0,
    chance_of_playing_next_round: null,
    news: '',
  };
}

function bootstrap(): FplBootstrapStatic {
  return {
    elements: [
      player(1, 'Unowned', '60.0'),
      player(2, 'Obscure', '1.2'),
      player(3, 'Mine', '45.0'),
    ],
    teams: [{ id: 1, name: 'Arsenal', short_name: 'ARS', code: 3 }],
    element_types: [],
    events: [
      {
        id: 12,
        name: 'Gameweek 12',
        deadline_time: '2026-11-27T18:30:00Z',
        is_current: true,
        is_next: false,
        is_previous: false,
        average_entry_score: 0,
        highest_score: null,
        finished: false,
      },
    ],
  };
}

const yourPicks: FplEntryGameweekPicks = {
  active_chip: null,
  automatic_subs: [],
  entry_history: {
    event: 12,
    points: 0,
    total_points: 606,
    rank: 0,
    rank_sort: 0,
    overall_rank: 4_362_395,
    event_transfers: 0,
    event_transfers_cost: 0,
    points_on_bench: 0,
  },
  picks: [{ element: 3, position: 1, multiplier: 2, is_captain: true, is_vice_captain: false }],
};

const liveGw: FplLiveGameweek = { elements: [] };

function cohort(sampled: number, startingCount: number): CohortSnapshotPayload {
  return {
    captains: [],
    ownership: [{ player_id: 1, starting_count: startingCount, bench_count: 0 }],
    transfers_in: [],
    transfers_out: [],
    chips: {},
    entries_sampled: sampled,
    avg_event_points: 0,
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'Overall ownership drives the list when no cohort is available',
    ({ Given, When, Then, And }) => {
      let result: ResolvedThreats;

      Given('a bootstrap where an unowned player is in 60 percent of squads', () => {
        expect(bootstrap().elements[0]?.selected_by_percent).toBe('60.0');
      });

      When('I resolve threats without a cohort', () => {
        result = resolveThreats({
          yourPicks,
          bootstrap: bootstrap(),
          liveGw,
          fixtures: [],
          gw: 12,
        });
      });

      Then('that player is listed with 60 percent ownership', () => {
        const threat = result.threats.find((t) => t.name === 'Unowned');
        expect(threat?.ownedByPct).toBeCloseTo(60, 5);
      });

      And('the list is marked as coming from the field', () => {
        expect(result.source).toBe('field');
      });

      And('a player below the ownership floor is left out', () => {
        expect(result.threats.find((t) => t.name === 'Obscure')).toBeUndefined();
      });

      And('a player the manager owns is left out', () => {
        expect(result.threats.find((t) => t.name === 'Mine')).toBeUndefined();
      });
    }
  );

  Scenario('A sampled cohort takes precedence over the field', ({ Given, When, Then, And }) => {
    let result: ResolvedThreats;

    Given('a bootstrap where an unowned player is in 60 percent of squads', () => {
      expect(bootstrap().elements).toHaveLength(3);
    });

    When('I resolve threats with a top-10k cohort that starts them in 90 percent of teams', () => {
      result = resolveThreats({
        yourPicks,
        cohort: cohort(1000, 900),
        bootstrap: bootstrap(),
        liveGw,
        fixtures: [],
        gw: 12,
      });
    });

    Then('that player is listed with 90 percent ownership', () => {
      expect(result.threats.find((t) => t.name === 'Unowned')?.ownedByPct).toBeCloseTo(90, 5);
    });

    And('the list is marked as coming from the top 10k', () => {
      expect(result.source).toBe('top_10k');
    });
  });

  Scenario('An empty cohort does not masquerade as a sample', ({ Given, When, Then }) => {
    let result: ResolvedThreats;

    Given('a bootstrap where an unowned player is in 60 percent of squads', () => {
      expect(bootstrap().elements).toHaveLength(3);
    });

    When('I resolve threats with a cohort that sampled nobody', () => {
      result = resolveThreats({
        yourPicks,
        cohort: cohort(0, 0),
        bootstrap: bootstrap(),
        liveGw,
        fixtures: [],
        gw: 12,
      });
    });

    Then('the list is marked as coming from the field', () => {
      expect(result.source).toBe('field');
      expect(result.threats.find((t) => t.name === 'Unowned')?.ownedByPct).toBeCloseTo(60, 5);
    });
  });
});
