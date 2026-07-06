import { describe, expect, it } from 'vitest';

import { aggregateToOwnershipMap, aggregatesToOwnershipByTier } from './from-aggregate';
import type { CohortSnapshotPayload } from './types';

function payload(overrides: Partial<CohortSnapshotPayload> = {}): CohortSnapshotPayload {
  return {
    captains: [{ player_id: 351, count: 410 }],
    ownership: [
      { player_id: 351, starting_count: 780, bench_count: 20 },
      { player_id: 328, starting_count: 500, bench_count: 0 },
    ],
    transfers_in: [],
    transfers_out: [],
    chips: {},
    entries_sampled: 1000,
    avg_event_points: 55,
    ...overrides,
  };
}

describe('aggregateToOwnershipMap', () => {
  it('derives ownership and captain percentages from counts over entries_sampled', () => {
    const map = aggregateToOwnershipMap(payload());
    expect(map[351]).toEqual({ ownershipPct: 78, captainPct: 41 });
    expect(map[328]).toEqual({ ownershipPct: 50, captainPct: 0 });
  });

  it('returns an empty map when no entries were sampled', () => {
    expect(aggregateToOwnershipMap(payload({ entries_sampled: 0 }))).toEqual({});
  });

  it('uses starting ownership only (bench does not count toward EO)', () => {
    const map = aggregateToOwnershipMap(
      payload({
        ownership: [{ player_id: 1, starting_count: 100, bench_count: 900 }],
        entries_sampled: 1000,
      })
    );
    expect(map[1]?.ownershipPct).toBe(10);
  });
});

describe('aggregatesToOwnershipByTier', () => {
  it('maps engine tiers onto EO tiers (legendary -> top_1k)', () => {
    const byTier = aggregatesToOwnershipByTier({
      legendary: payload({
        entries_sampled: 1000,
        ownership: [{ player_id: 9, starting_count: 900, bench_count: 0 }],
        captains: [],
      }),
      top_10k: payload(),
    });
    expect(byTier.top_1k[9]?.ownershipPct).toBe(90);
    expect(byTier.top_10k[351]?.ownershipPct).toBe(78);
    expect(byTier.top_100k).toEqual({});
    expect(byTier.overall).toEqual({});
  });
});
