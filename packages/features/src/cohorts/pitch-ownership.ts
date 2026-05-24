import type { CohortOwnershipMap } from '../effective-ownership/compute-eo';

export type PitchOwnershipSource = 'top10k' | 'global';

export interface PitchOwnership {
  value: number;
  source: PitchOwnershipSource;
}

export function resolvePitchOwnership(
  playerId: number,
  top10kOwnership: CohortOwnershipMap | undefined,
  globalOwnershipPct: number | undefined
): PitchOwnership | undefined {
  const sampled = top10kOwnership?.[playerId];
  if (sampled !== undefined && Number.isFinite(sampled.ownershipPct)) {
    return { value: sampled.ownershipPct, source: 'top10k' };
  }
  if (globalOwnershipPct !== undefined && Number.isFinite(globalOwnershipPct)) {
    return { value: globalOwnershipPct, source: 'global' };
  }
  return undefined;
}
