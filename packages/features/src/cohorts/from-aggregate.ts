import type {
  CohortOwnershipByTier,
  CohortOwnershipMap,
  EoTier,
} from '../effective-ownership/compute-eo';
import type { CohortSnapshotPayload, CohortTier } from './types';

export type CohortAggregatesByTier = Partial<Record<CohortTier, CohortSnapshotPayload>>;

const ENGINE_TIER_TO_EO_TIER: Record<CohortTier, EoTier> = {
  legendary: 'top_1k',
  top_10k: 'top_10k',
  top_100k: 'top_100k',
  overall: 'overall',
};

export function aggregateToOwnershipMap(payload: CohortSnapshotPayload): CohortOwnershipMap {
  const sampled = payload.entries_sampled;
  const map: CohortOwnershipMap = {};
  if (sampled <= 0) return map;

  const captainById = new Map<number, number>();
  for (const c of payload.captains) captainById.set(c.player_id, c.count);

  for (const own of payload.ownership) {
    const ownershipPct = (own.starting_count / sampled) * 100;
    const captainPct = ((captainById.get(own.player_id) ?? 0) / sampled) * 100;
    map[own.player_id] = { ownershipPct, captainPct };
  }
  return map;
}

export function aggregatesToOwnershipByTier(
  aggregates: CohortAggregatesByTier
): CohortOwnershipByTier {
  const byTier: CohortOwnershipByTier = {
    top_1k: {},
    top_10k: {},
    top_100k: {},
    overall: {},
  };
  for (const tier of Object.keys(aggregates)) {
    const engineTier = isCohortTier(tier) ? tier : null;
    if (engineTier === null) continue;
    const payload = aggregates[engineTier];
    if (!payload) continue;
    byTier[ENGINE_TIER_TO_EO_TIER[engineTier]] = aggregateToOwnershipMap(payload);
  }
  return byTier;
}

function isCohortTier(value: string): value is CohortTier {
  return (
    value === 'legendary' || value === 'top_10k' || value === 'top_100k' || value === 'overall'
  );
}
