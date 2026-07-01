import type { Tier } from '@simplyfpl/types';

export interface SubscriptionState {
  tier: Tier | null | undefined;
}

const KNOWN_TIERS: readonly Tier[] = ['free', 'pro', 'ultimate'];

/**
 * Resolve a user's entitlement tier from their Supabase subscription state.
 *
 * STRIPE STUB SEAM: entitlement is sourced from `profiles.tier` only — never
 * from a live Stripe call. Today that column is set manually. When Stripe
 * billing is unblocked, the webhook maps the Pro/Ultimate price IDs to a tier
 * and writes it here; every reader stays unchanged because they only ever read
 * subscription state, not Stripe.
 */
export function resolveTier(state: SubscriptionState): Tier {
  const { tier } = state;
  if (tier && KNOWN_TIERS.includes(tier)) return tier;
  return 'free';
}
