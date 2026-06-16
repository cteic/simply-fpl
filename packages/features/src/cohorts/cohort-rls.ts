import type { CohortTier } from './types';

export type UserTier = 'free' | 'pro' | 'ultimate';

export function canReadCohortTier(userTier: UserTier, cohortTier: CohortTier): boolean {
  return cohortTier === 'top_10k' || userTier === 'pro' || userTier === 'ultimate';
}
