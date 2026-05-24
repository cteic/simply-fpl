import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { CohortOwnershipMap } from '../effective-ownership/compute-eo';
import { aggregateToOwnershipMap } from './from-aggregate';
import { type PitchOwnership, resolvePitchOwnership } from './pitch-ownership';
import type { CohortSnapshotPayload } from './types';

const feature = await loadFeature('./pitch-ownership.feature');

function sampleWith(ownership: CohortSnapshotPayload['ownership']): CohortOwnershipMap {
  const payload: CohortSnapshotPayload = {
    captains: [],
    ownership,
    transfers_in: [],
    transfers_out: [],
    chips: {},
    entries_sampled: 1000,
    avg_event_points: 55,
  };
  return aggregateToOwnershipMap(payload);
}

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'Top 10k ownership is shown when the cohort sample has the player',
    ({ Given, And, When, Then }) => {
      let top10k: CohortOwnershipMap | undefined;
      let globalPct: number | undefined;
      let resolved: PitchOwnership | undefined;

      Given('a top-10k cohort sample where player 351 is owned by 78%', () => {
        top10k = sampleWith([{ player_id: 351, starting_count: 780, bench_count: 20 }]);
      });

      And('player 351 has a global ownership of 45.0%', () => {
        globalPct = 45.0;
      });

      When('pitch ownership is resolved for player 351 in Top 10k mode', () => {
        resolved = resolvePitchOwnership(351, top10k, globalPct);
      });

      Then('the displayed ownership is 78% sourced from the top-10k sample', () => {
        expect(resolved).toEqual({ value: 78, source: 'top10k' });
      });
    }
  );

  Scenario(
    'Falls back to global ownership when the sample is missing the player',
    ({ Given, And, When, Then }) => {
      let top10k: CohortOwnershipMap | undefined;
      let globalPct: number | undefined;
      let resolved: PitchOwnership | undefined;

      Given('a top-10k cohort sample that does not include player 999', () => {
        top10k = sampleWith([{ player_id: 351, starting_count: 780, bench_count: 20 }]);
      });

      And('player 999 has a global ownership of 12.5%', () => {
        globalPct = 12.5;
      });

      When('pitch ownership is resolved for player 999 in Top 10k mode', () => {
        resolved = resolvePitchOwnership(999, top10k, globalPct);
      });

      Then('the displayed ownership is 12.5% sourced from global ownership', () => {
        expect(resolved).toEqual({ value: 12.5, source: 'global' });
      });

      And('the resolved value is a finite number', () => {
        expect(Number.isFinite(resolved?.value)).toBe(true);
      });
    }
  );

  Scenario(
    'Falls back to global ownership when no cohort sample exists yet',
    ({ Given, And, When, Then }) => {
      let top10k: CohortOwnershipMap | undefined;
      let globalPct: number | undefined;
      let resolved: PitchOwnership | undefined;

      Given('no top-10k cohort sample is available', () => {
        top10k = undefined;
      });

      And('player 42 has a global ownership of 7.3%', () => {
        globalPct = 7.3;
      });

      When('pitch ownership is resolved for player 42 in Top 10k mode', () => {
        resolved = resolvePitchOwnership(42, top10k, globalPct);
      });

      Then('the displayed ownership is 7.3% sourced from global ownership', () => {
        expect(resolved).toEqual({ value: 7.3, source: 'global' });
      });

      And('the resolved value is a finite number', () => {
        expect(Number.isFinite(resolved?.value)).toBe(true);
      });
    }
  );
});
