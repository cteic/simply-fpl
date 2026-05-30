import { describe, expect, it } from 'vitest';

import { billingPortalReturnUrl, readStripePortalUrl } from '@/lib/stripe-portal';

describe('Stripe billing portal route helpers', () => {
  it('reads a valid Stripe portal session url', () => {
    expect(readStripePortalUrl({ url: 'https://billing.stripe.com/session/test' })).toBe(
      'https://billing.stripe.com/session/test'
    );
  });

  it('rejects a missing Stripe portal session url', () => {
    expect(readStripePortalUrl({ id: 'bps_test' })).toBeNull();
  });

  it('returns users to settings on the current origin', () => {
    expect(billingPortalReturnUrl('https://simply-fpl.pages.dev/api/stripe/portal')).toBe(
      'https://simply-fpl.pages.dev/settings'
    );
  });
});
