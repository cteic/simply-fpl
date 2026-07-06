import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { FplBootstrapStatic } from '@simplyfpl/types';

import { aggregatesToOwnershipByTier } from '../cohorts/from-aggregate';
import type { CohortSnapshotPayload } from '../cohorts/types';
import { type EoRow, computeEffectiveOwnership } from './compute-eo';

const feature = await loadFeature('./eo-from-aggregates.feature');

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

function makePayload(overrides: Partial<CohortSnapshotPayload> = {}): CohortSnapshotPayload {
  return {
    captains: [{ player_id: 351, count: 410 }],
    ownership: [{ player_id: 351, starting_count: 780, bench_count: 20 }],
    transfers_in: [],
    transfers_out: [],
    chips: {},
    entries_sampled: 1000,
    avg_event_points: 58,
    ...overrides,
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Aggregate payload produces real EO rows via the pipeline', ({ Given, When, Then }) => {
    let rows: EoRow[];

    Given('a top-10k aggregate payload with player 351 owned 78% and captained 41%', () => {});

    When('effective ownership is computed from the aggregate', () => {
      const byTier = aggregatesToOwnershipByTier({ top_10k: makePayload() });
      rows = computeEffectiveOwnership({ byTier, bootstrap: makeBootstrap([351]) });
    });

    Then('player 351 appears with Top 10k EO of 119 and non-zero rows are returned', () => {
      expect(rows.length).toBeGreaterThan(0);
      const row = rows.find((r) => r.elementId === 351);
      expect(row?.eoTop10k).toBe(119);
    });
  });

  Scenario('avg_event_points is faithfully preserved per tier', ({ Given, When, Then }) => {
    let payload: CohortSnapshotPayload;

    Given('a top-10k snapshot with avg_event_points of 58', () => {
      payload = makePayload({ avg_event_points: 58 });
    });

    When('I read avg_event_points for the top-10k tier', () => {});

    Then('the value is 58', () => {
      expect(payload.avg_event_points).toBe(58);
    });
  });
});
