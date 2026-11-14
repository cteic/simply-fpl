import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const sessionsCreate = vi.fn();
let storedCustomerId: string | null = null;

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ checkout: { sessions: { create: sessionsCreate } } }),
}));

vi.mock('@/lib/env', () => ({
  getStripeEnv: () => ({
    pricePROMonthly: 'price_pro_monthly',
    pricePROYearly: 'price_pro_yearly',
    pricePROLifetime: 'price_pro_lifetime',
    priceULTIMATEMonthly: 'price_ult_monthly',
    priceULTIMATEYearly: 'price_ult_yearly',
    priceULTIMATELifetime: 'price_ult_lifetime',
  }),
}));

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: () =>
    Promise.resolve({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: 'user-1', email: 'a@b.test' } } }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: { stripe_customer_id: storedCustomerId }, error: null }),
          }),
        }),
      }),
    }),
}));

function makeRequest(plan: string): NextRequest {
  return new NextRequest('http://localhost/api/stripe/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
}

async function checkoutParams(plan: string): Promise<Record<string, unknown>> {
  const { POST } = await import('./route');
  await POST(makeRequest(plan));
  const params: unknown = sessionsCreate.mock.calls[0]?.[0];
  if (typeof params !== 'object' || params === null) throw new Error('no session created');
  return { ...params };
}

describe('POST /api/stripe/checkout', () => {
  beforeEach(() => {
    sessionsCreate.mockReset();
    sessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.test/s' });
    storedCustomerId = null;
  });

  it('reuses the profile Stripe customer when one exists', async () => {
    storedCustomerId = 'cus_existing';
    const params = await checkoutParams('ultimate-monthly');
    expect(params['customer']).toBe('cus_existing');
    expect(params['customer_email']).toBeUndefined();
  });

  it('asks Stripe to create a customer for a first lifetime purchase', async () => {
    const params = await checkoutParams('pro-lifetime');
    expect(params['mode']).toBe('payment');
    expect(params['customer_creation']).toBe('always');
    expect(params['customer_email']).toBe('a@b.test');
  });

  it('leaves customer creation to Stripe for subscriptions', async () => {
    const params = await checkoutParams('pro-monthly');
    expect(params['customer_creation']).toBeUndefined();
  });
});
