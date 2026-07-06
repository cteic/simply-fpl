import type { Tier } from '@simplyfpl/types';

import { useAuth } from '../auth/use-auth';

export * from './entitlement';

export function isPro(tier: Tier): boolean {
  return tier === 'pro' || tier === 'ultimate';
}

export function isUltimate(tier: Tier): boolean {
  return tier === 'ultimate';
}

export function useTier() {
  const { tier, isLoading } = useAuth();
  return {
    tier,
    isPro: isPro(tier),
    isUltimate: isUltimate(tier),
    isLoading,
  };
}
