import type { Tier } from '@simplyfpl/types';

export const MAX_TRACKED_LEAGUES_FREE = 1;
export const MAX_TRACKED_LEAGUES_PRO = 10;

export function getMaxTrackedLeagues(tier: Tier): number {
  if (tier === 'pro' || tier === 'ultimate') return MAX_TRACKED_LEAGUES_PRO;
  return MAX_TRACKED_LEAGUES_FREE;
}
