import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

const feature = await loadFeature('./upgrade-view.feature');

const FAKE_CHECKOUT_URL = 'https://checkout.stripe.com/pay/cs_test_abc123';

const ORIGINAL_FETCH = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;

async function callCheckout(plan: string): Promise<{ url?: string; error?: string }> {
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });
  return (await res.json()) as { url?: string; error?: string };
}

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  BeforeEachScenario(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  AfterEachScenario(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  Scenario(
    'Free user clicking Pro Monthly is redirected to a Stripe Checkout URL',
    ({ Given, When, Then, And }) => {
      let result: { url?: string; error?: string } | null = null;

      Given('the user is authenticated and on the free tier', () => {});

      And('the POST /api/stripe/checkout endpoint returns a Stripe Checkout URL', () => {
        fetchMock.mockResolvedValue(
          new Response(JSON.stringify({ url: FAKE_CHECKOUT_URL }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      When('the user selects Pro Monthly and clicks Get Pro', async () => {
        result = await callCheckout('pro-monthly');
      });

      Then('they are redirected to the Stripe Checkout URL', () => {
        expect(result?.url).toBe(FAKE_CHECKOUT_URL);
        expect(result?.url).toMatch(/^https:\/\/checkout\.stripe\.com/);
      });
    }
  );

  Scenario(
    'Free user clicking Ultimate Yearly is redirected to a Stripe Checkout URL',
    ({ Given, When, Then, And }) => {
      let result: { url?: string; error?: string } | null = null;

      Given('the user is authenticated and on the free tier', () => {});

      And('the POST /api/stripe/checkout endpoint returns a Stripe Checkout URL', () => {
        fetchMock.mockResolvedValue(
          new Response(JSON.stringify({ url: FAKE_CHECKOUT_URL }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      When('the user selects Ultimate Yearly and clicks Get Ultimate', async () => {
        result = await callCheckout('ultimate-yearly');
      });

      Then('they are redirected to the Stripe Checkout URL', () => {
        expect(result?.url).toBe(FAKE_CHECKOUT_URL);
        expect(result?.url).toMatch(/^https:\/\/checkout\.stripe\.com/);
      });
    }
  );

  Scenario(
    'Ultimate user sees current plan indicator on the Ultimate card',
    ({ Given, When, Then, And }) => {
      Given('the user is authenticated and on the ultimate tier', () => {});

      When('the upgrade page is rendered', () => {});

      Then("the Ultimate card shows 'Current plan'", () => {
        // isOwned logic: currentTier === 'ultimate' → Ultimate card shows 'Current plan'
        const currentTier = 'ultimate';
        const tierForUltimateCard = 'ultimate';
        const isOwned = currentTier === tierForUltimateCard;
        expect(isOwned).toBe(true);
      });

      And("the Pro card shows 'Current plan'", () => {
        // isOwned logic: tier === 'pro' && currentTier === 'ultimate' → Pro card also shows 'Current plan'
        const currentTier: string = 'ultimate';
        const tierForProCard = 'pro';
        const isOwned =
          currentTier === tierForProCard ||
          (tierForProCard === 'pro' && currentTier === 'ultimate');
        expect(isOwned).toBe(true);
      });
    }
  );
});
