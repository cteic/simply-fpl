import type { Tier } from '@simplyfpl/types';

export type FrankSource = 'weekly-cache' | 'live';

export interface FrankAccess {
  tier: Tier;
  source: FrankSource;
  canAskOnDemand: boolean;
  upgradeTo: Tier | null;
}

export function resolveFrankAccess(tier: Tier): FrankAccess {
  if (tier === 'ultimate') {
    return { tier, source: 'live', canAskOnDemand: true, upgradeTo: null };
  }

  return { tier, source: 'weekly-cache', canAskOnDemand: false, upgradeTo: 'ultimate' };
}
