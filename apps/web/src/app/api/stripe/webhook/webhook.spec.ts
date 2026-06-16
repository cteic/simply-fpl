import type { NextRequest } from 'next/server';

import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

const feature = await loadFeature('./webhook.feature');

const FAKE_USER_ID = 'user-abc-123';
const FAKE_CUSTOMER_ID = 'cus_test123';
const FAKE_SUBSCRIPTION_ID = 'sub_test456';
const FAKE_CHARGE_ID = 'ch_test789';
const FAKE_EVENT_ID = 'evt_test789';
const FAKE_PRO_MONTHLY_PRICE = 'price_pro_monthly_test';

function makeCheckoutSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cs_test',
    mode: 'subscription',
    customer: FAKE_CUSTOMER_ID,
    subscription: FAKE_SUBSCRIPTION_ID,
    metadata: { user_id: FAKE_USER_ID, target_tier: 'pro' },
    ...overrides,
  };
}

function makeSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: FAKE_SUBSCRIPTION_ID,
    customer: FAKE_CUSTOMER_ID,
    items: { data: [{ price: { id: FAKE_PRO_MONTHLY_PRICE } }] },
    status: 'active',
    ...overrides,
  };
}

function makeCharge(overrides: Record<string, unknown> = {}) {
  return {
    id: FAKE_CHARGE_ID,
    object: 'charge',
    customer: FAKE_CUSTOMER_ID,
    refunded: true,
    amount: 999,
    amount_refunded: 999,
    ...overrides,
  };
}

function makeDispute(overrides: Record<string, unknown> = {}) {
  return {
    id: 'dp_test001',
    object: 'dispute',
    charge: FAKE_CHARGE_ID,
    ...overrides,
  };
}

let mockStripeConstructEventAsync: ReturnType<typeof vi.fn>;
let mockStripeChargesRetrieve: ReturnType<typeof vi.fn>;
let mockSupabaseInsert: ReturnType<typeof vi.fn>;
let mockSupabaseUpdate: ReturnType<typeof vi.fn>;
let mockSupabaseSelect: ReturnType<typeof vi.fn>;
let processedEventIds: Set<string>;
let mockUpdateError: { message: string } | null;
let mockInsertTransientError: boolean;

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    webhooks: {
      constructEventAsync: (...args: unknown[]) => mockStripeConstructEventAsync(...args),
    },
    charges: {
      retrieve: (...args: unknown[]) => mockStripeChargesRetrieve(...args),
    },
  }),
}));

vi.mock('@/lib/env', () => ({
  getStripeEnv: () => ({
    secretKey: 'sk_test',
    webhookSecret: 'whsec_test',
    pricePROMonthly: FAKE_PRO_MONTHLY_PRICE,
    pricePROYearly: 'price_pro_yearly_test',
    pricePROLifetime: 'price_pro_lifetime_test',
    priceULTIMATEMonthly: 'price_ult_monthly_test',
    priceULTIMATEYearly: 'price_ult_yearly_test',
    priceULTIMATELifetime: 'price_ult_lifetime_test',
  }),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdminClient: () => ({
    from: (table: string) => {
      if (table === 'stripe_events') {
        return {
          insert: ({ id }: { id: string }) => {
            if (processedEventIds.has(id)) {
              return Promise.resolve({ error: { code: '23505' } });
            }
            if (mockInsertTransientError) {
              return Promise.resolve({ error: { code: '08006', message: 'connection failure' } });
            }
            processedEventIds.add(id);
            return mockSupabaseInsert(id);
          },
        };
      }
      return {
        insert: mockSupabaseInsert,
        update: (data: unknown) => ({
          eq: (_col: string, _val: string) => {
            mockSupabaseUpdate(data);
            return Promise.resolve({ error: mockUpdateError });
          },
        }),
        select: (_cols: string) => ({
          eq: (_col: string, _val: string) => ({
            maybeSingle: () => mockSupabaseSelect(),
          }),
        }),
      };
    },
  }),
}));

function makeRequest(body: string, sig = 'stripe-sig-mock') {
  return {
    headers: { get: (h: string) => (h === 'stripe-signature' ? sig : null) },
    text: () => Promise.resolve(body),
  } as unknown as NextRequest;
}

describeFeature(feature, ({ Scenario, BeforeEachScenario }) => {
  BeforeEachScenario(() => {
    processedEventIds = new Set();
    mockUpdateError = null;
    mockInsertTransientError = false;
    mockStripeConstructEventAsync = vi.fn();
    mockStripeChargesRetrieve = vi.fn().mockResolvedValue(makeCharge());
    mockSupabaseInsert = vi.fn().mockResolvedValue({ error: null });
    mockSupabaseUpdate = vi.fn();
    mockSupabaseSelect = vi.fn().mockResolvedValue({ data: { id: FAKE_USER_ID }, error: null });
  });

  Scenario(
    'checkout.session.completed for a Pro Monthly purchase sets profile tier to pro',
    ({ Given, When, Then, And }) => {
      let updatedData: Record<string, unknown> | null = null;

      Given('a valid Stripe checkout.session.completed event for Pro Monthly', () => {
        const event = {
          id: FAKE_EVENT_ID,
          type: 'checkout.session.completed',
          data: { object: makeCheckoutSession() },
        };
        mockStripeConstructEventAsync.mockResolvedValue(event);
        mockSupabaseUpdate = vi.fn().mockImplementation((data: Record<string, unknown>) => {
          updatedData = data;
          return { eq: () => Promise.resolve({ error: null }) };
        });
      });

      When('the webhook handler processes the event', async () => {
        const { POST } = await import('./route');
        const req = makeRequest('{}');
        await POST(req);
      });

      Then("the user's profile tier becomes 'pro'", () => {
        expect(updatedData?.['tier']).toBe('pro');
      });

      And('the stripe_customer_id is stored on the profile', () => {
        expect(updatedData?.['stripe_customer_id']).toBe(FAKE_CUSTOMER_ID);
      });

      And('the stripe_subscription_id is stored on the profile', () => {
        expect(updatedData?.['stripe_subscription_id']).toBe(FAKE_SUBSCRIPTION_ID);
      });
    }
  );

  Scenario(
    'checkout.session.completed for a Pro Lifetime purchase sets profile tier to pro',
    ({ Given, When, Then, And }) => {
      let updatedData: Record<string, unknown> | null = null;

      Given(
        'a valid Stripe checkout.session.completed event for Pro Lifetime (payment mode)',
        () => {
          const event = {
            id: FAKE_EVENT_ID,
            type: 'checkout.session.completed',
            data: {
              object: makeCheckoutSession({
                mode: 'payment',
                subscription: null,
              }),
            },
          };
          mockStripeConstructEventAsync.mockResolvedValue(event);
          mockSupabaseUpdate = vi.fn().mockImplementation((data: Record<string, unknown>) => {
            updatedData = data;
            return { eq: () => Promise.resolve({ error: null }) };
          });
        }
      );

      When('the webhook handler processes the event', async () => {
        const { POST } = await import('./route');
        const req = makeRequest('{}');
        await POST(req);
      });

      Then("the user's profile tier becomes 'pro'", () => {
        expect(updatedData?.['tier']).toBe('pro');
      });

      And('the stripe_subscription_id is null on the profile', () => {
        expect(updatedData?.['stripe_subscription_id']).toBeNull();
      });
    }
  );

  Scenario(
    'customer.subscription.deleted reverts the user to the free tier',
    ({ Given, When, Then }) => {
      let updatedData: Record<string, unknown> | null = null;

      Given('an existing Pro subscriber', () => {
        const event = {
          id: FAKE_EVENT_ID,
          type: 'customer.subscription.deleted',
          data: { object: makeSubscription() },
        };
        mockStripeConstructEventAsync.mockResolvedValue(event);
        mockSupabaseUpdate = vi.fn().mockImplementation((data: Record<string, unknown>) => {
          updatedData = data;
          return { eq: () => Promise.resolve({ error: null }) };
        });
      });

      When('the webhook receives customer.subscription.deleted', async () => {
        const { POST } = await import('./route');
        const req = makeRequest('{}');
        await POST(req);
      });

      Then("the user's profile tier becomes 'free'", () => {
        expect(updatedData?.['tier']).toBe('free');
      });
    }
  );

  Scenario(
    'duplicate event returns 200 after handlers re-run idempotently',
    ({ Given, When, Then }) => {
      let response: Response | null = null;

      Given('the stripe_events table already contains the event ID', () => {
        processedEventIds.add(FAKE_EVENT_ID);
        const event = {
          id: FAKE_EVENT_ID,
          type: 'checkout.session.completed',
          data: { object: makeCheckoutSession() },
        };
        mockStripeConstructEventAsync.mockResolvedValue(event);
      });

      When('the webhook handler processes the same event again', async () => {
        const { POST } = await import('./route');
        const req = makeRequest('{}');
        response = await POST(req);
      });

      Then('the response status is 200', () => {
        expect(response?.status).toBe(200);
      });
    }
  );

  Scenario(
    'handler DB write failure returns 5xx so Stripe retries',
    ({ Given, When, Then, And }) => {
      let response: Response | null = null;

      Given('a valid Stripe checkout.session.completed event for Pro Monthly', () => {
        const event = {
          id: FAKE_EVENT_ID,
          type: 'checkout.session.completed',
          data: { object: makeCheckoutSession() },
        };
        mockStripeConstructEventAsync.mockResolvedValue(event);
      });

      And('the profiles update will fail with a DB error', () => {
        mockUpdateError = { message: 'connection timeout' };
      });

      When('the webhook handler processes the event', async () => {
        const { POST } = await import('./route');
        const req = makeRequest('{}');
        response = await POST(req);
      });

      Then('the response status is 500', () => {
        expect(response?.status).toBe(500);
      });

      And('no idempotency record is written for the event', () => {
        expect(processedEventIds.has(FAKE_EVENT_ID)).toBe(false);
      });
    }
  );

  Scenario(
    'transient DB error on idempotency insert after successful handler returns 200',
    ({ Given, When, Then, And }) => {
      let response: Response | null = null;

      Given('a valid Stripe checkout.session.completed event for Pro Monthly', () => {
        const event = {
          id: FAKE_EVENT_ID,
          type: 'checkout.session.completed',
          data: { object: makeCheckoutSession() },
        };
        mockStripeConstructEventAsync.mockResolvedValue(event);
      });

      And('the stripe_events insert will fail with a transient error', () => {
        mockInsertTransientError = true;
      });

      When('the webhook handler processes the event', async () => {
        const { POST } = await import('./route');
        const req = makeRequest('{}');
        response = await POST(req);
      });

      Then('the response status is 200', () => {
        expect(response?.status).toBe(200);
      });
    }
  );

  Scenario(
    'charge.refunded with a full refund reverts the user to the free tier',
    ({ Given, When, Then }) => {
      let updatedData: Record<string, unknown> | null = null;

      Given('an existing Pro subscriber with a fully refunded charge', () => {
        const event = {
          id: FAKE_EVENT_ID,
          type: 'charge.refunded',
          data: { object: makeCharge({ refunded: true, amount: 999, amount_refunded: 999 }) },
        };
        mockStripeConstructEventAsync.mockResolvedValue(event);
        mockSupabaseUpdate = vi.fn().mockImplementation((data: Record<string, unknown>) => {
          updatedData = data;
          return { eq: () => Promise.resolve({ error: null }) };
        });
      });

      When('the webhook receives charge.refunded', async () => {
        const { POST } = await import('./route');
        const req = makeRequest('{}');
        await POST(req);
      });

      Then("the user's profile tier becomes 'free'", () => {
        expect(updatedData?.['tier']).toBe('free');
      });
    }
  );

  Scenario(
    "charge.refunded with a partial refund does not revert the user's tier",
    ({ Given, When, Then }) => {
      Given('an existing Pro subscriber with a partially refunded charge', () => {
        const event = {
          id: FAKE_EVENT_ID,
          type: 'charge.refunded',
          data: { object: makeCharge({ refunded: false, amount: 999, amount_refunded: 499 }) },
        };
        mockStripeConstructEventAsync.mockResolvedValue(event);
      });

      When('the webhook receives charge.refunded', async () => {
        const { POST } = await import('./route');
        const req = makeRequest('{}');
        await POST(req);
      });

      Then('the profiles table is not updated', () => {
        expect(mockSupabaseUpdate).not.toHaveBeenCalled();
      });
    }
  );

  Scenario('charge.dispute.created reverts the user to the free tier', ({ Given, When, Then }) => {
    let updatedData: Record<string, unknown> | null = null;

    Given('an existing Pro subscriber with a dispute on their charge', () => {
      const event = {
        id: FAKE_EVENT_ID,
        type: 'charge.dispute.created',
        data: { object: makeDispute() },
      };
      mockStripeConstructEventAsync.mockResolvedValue(event);
      mockStripeChargesRetrieve = vi.fn().mockResolvedValue(makeCharge());
      mockSupabaseUpdate = vi.fn().mockImplementation((data: Record<string, unknown>) => {
        updatedData = data;
        return { eq: () => Promise.resolve({ error: null }) };
      });
    });

    When('the webhook receives charge.dispute.created', async () => {
      const { POST } = await import('./route');
      const req = makeRequest('{}');
      await POST(req);
    });

    Then("the user's profile tier becomes 'free'", () => {
      expect(updatedData?.['tier']).toBe('free');
    });
  });
});
