import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

import { dispatchNotification } from './dispatch';

const feature = await loadFeature('./dispatch.feature');

const SUPABASE_URL = 'https://test.supabase.co';
const SERVICE_ROLE = 'test-service-role';

const ORIGINAL_FETCH = globalThis.fetch;
let capturedUrls: string[] = [];

interface MockEnvOverrides {
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
}

function makeEnv(overrides?: MockEnvOverrides): Parameters<typeof dispatchNotification>[0] {
  return {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE: SERVICE_ROLE,
    VAPID_PUBLIC_KEY: 'BTest_PublicKey_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    VAPID_PRIVATE_KEY: 'test-private-key-aaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    ...overrides,
  } as unknown as Parameters<typeof dispatchNotification>[0];
}

function setupFetchMock(prefsResult: Array<{ user_id: string }> = []) {
  const mock = vi.fn((url: string) => {
    capturedUrls.push(url);
    return Promise.resolve(
      new Response(JSON.stringify(prefsResult), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });
  globalThis.fetch = mock as unknown as typeof fetch;
}

const TEST_PAYLOAD = {
  type: 'deadline_reminder',
  title: 'Test',
  body: 'Test body',
  url: 'https://simplyfpl.com/',
} as const;

const VALID_IDS = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  BeforeEachScenario(() => {
    capturedUrls = [];
    vi.clearAllMocks();
    setupFetchMock([]);
  });

  AfterEachScenario(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  Scenario('Valid user_ids pass through to Supabase prefs query', ({ Given, When, Then }) => {
    let capturedPrefsUrl = '';

    Given('VAPID keys are configured', () => undefined);

    When('dispatchNotification is called with valid UUID user_ids', async () => {
      await dispatchNotification(makeEnv(), {
        event: 'deadline_reminder',
        userIds: VALID_IDS,
        payload: TEST_PAYLOAD,
      });
      capturedPrefsUrl = capturedUrls.find((u) => u.includes('notification_prefs')) ?? '';
    });

    Then('the Supabase prefs URL includes the user_id=in.(...) filter', () => {
      expect(capturedPrefsUrl).toContain('user_id=in.');
      for (const id of VALID_IDS) {
        expect(capturedPrefsUrl).toContain(encodeURIComponent(id));
      }
    });
  });

  Scenario(
    'Non-UUID user_id is rejected before reaching Supabase',
    ({ Given, When, Then, And }) => {
      let result: Awaited<ReturnType<typeof dispatchNotification>>;

      Given('VAPID keys are configured', () => undefined);

      When('dispatchNotification is called with user_ids containing "not-a-uuid"', async () => {
        result = await dispatchNotification(makeEnv(), {
          event: 'deadline_reminder',
          userIds: ['not-a-uuid'],
          payload: TEST_PAYLOAD,
        });
      });

      Then('no Supabase request is made', () => {
        expect(capturedUrls.filter((u) => u.includes('supabase'))).toHaveLength(0);
      });

      And('the result is { sent: 0, failed: 0 }', () => {
        expect(result).toEqual({ sent: 0, failed: 0 });
      });
    }
  );

  Scenario('SQL-injection-shaped user_id is rejected', ({ Given, When, Then, And }) => {
    let result: Awaited<ReturnType<typeof dispatchNotification>>;

    Given('VAPID keys are configured', () => undefined);

    When(
      'dispatchNotification is called with user_ids containing an injection string',
      async () => {
        result = await dispatchNotification(makeEnv(), {
          event: 'deadline_reminder',
          userIds: ["00000000-0000-0000-0000-000000000000') OR 1=1--"],
          payload: TEST_PAYLOAD,
        });
      }
    );

    Then('no Supabase request is made', () => {
      expect(capturedUrls.filter((u) => u.includes('supabase'))).toHaveLength(0);
    });

    And('the result is { sent: 0, failed: 0 }', () => {
      expect(result).toEqual({ sent: 0, failed: 0 });
    });
  });

  Scenario('No user_ids means all subscribed users are queried', ({ Given, When, Then }) => {
    let capturedPrefsUrl = '';

    Given('VAPID keys are configured', () => undefined);

    When('dispatchNotification is called without user_ids', async () => {
      await dispatchNotification(makeEnv(), {
        event: 'deadline_reminder',
        payload: TEST_PAYLOAD,
      });
      capturedPrefsUrl = capturedUrls.find((u) => u.includes('notification_prefs')) ?? '';
    });

    Then('the Supabase prefs URL does not include user_id filter', () => {
      expect(capturedPrefsUrl).not.toContain('user_id=in.');
    });
  });

  Scenario('Returns early when VAPID keys are missing', ({ Given, When, Then, And }) => {
    let result: Awaited<ReturnType<typeof dispatchNotification>>;

    Given('VAPID keys are not configured', () => undefined);

    When('dispatchNotification is called without user_ids', async () => {
      result = await dispatchNotification(
        makeEnv({ VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '' }),
        { event: 'deadline_reminder', payload: TEST_PAYLOAD }
      );
    });

    Then('no Supabase request is made', () => {
      expect(capturedUrls.filter((u) => u.includes('supabase'))).toHaveLength(0);
    });

    And('the result is { sent: 0, failed: 0 }', () => {
      expect(result).toEqual({ sent: 0, failed: 0 });
    });
  });
});
