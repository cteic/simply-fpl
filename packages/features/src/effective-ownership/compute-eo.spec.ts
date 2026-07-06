import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { FplBootstrapStatic } from '@simplyfpl/types';

import { type CohortOwnershipByTier, type EoRow, computeEffectiveOwnership } from './compute-eo';

const feature = await loadFeature('./compute-eo.feature');

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

function emptyByTier(): CohortOwnershipByTier {
  return { top_1k: {}, top_10k: {}, top_100k: {}, overall: {} };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('EO sums raw ownership and captaincy percentages', ({ Given, When, Then }) => {
    let rows: EoRow[];

    Given('a player owned by 50% of Top 10k managers and captained by 30% of them', () => {});

    When('I compute effective ownership for that tier', () => {
      const byTier = emptyByTier();
      byTier.top_10k[1] = { ownershipPct: 50, captainPct: 30 };
      rows = computeEffectiveOwnership({ byTier, bootstrap: makeBootstrap([1]) });
    });

    Then("the player's Top 10k EO should be 80", () => {
      expect(rows[0]?.eoTop10k).toBe(80);
    });
  });

  Scenario('Rows are sorted by Top 10k EO descending', ({ Given, When, Then }) => {
    let rows: EoRow[];

    Given('player 1 has Top 10k EO 90 and player 2 has Top 10k EO 30', () => {});

    When('I compute effective ownership', () => {
      const byTier = emptyByTier();
      byTier.top_10k[1] = { ownershipPct: 80, captainPct: 10 };
      byTier.top_10k[2] = { ownershipPct: 25, captainPct: 5 };
      rows = computeEffectiveOwnership({ byTier, bootstrap: makeBootstrap([1, 2]) });
    });

    Then('player 1 should appear before player 2', () => {
      const ids = rows.map((r) => r.elementId);
      expect(ids.indexOf(1)).toBeLessThan(ids.indexOf(2));
    });
  });

  Scenario('Missing tier data defaults to zero', ({ Given, When, Then }) => {
    let rows: EoRow[];

    Given('a player has Top 10k stats but no Top 1k stats', () => {});

    When('I compute effective ownership', () => {
      const byTier = emptyByTier();
      byTier.top_10k[1] = { ownershipPct: 40, captainPct: 10 };
      rows = computeEffectiveOwnership({ byTier, bootstrap: makeBootstrap([1]) });
    });

    Then("the player's Top 1k EO should be 0", () => {
      expect(rows[0]?.eoTop1k).toBe(0);
    });
  });
});
