import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

import { dispatchNotification } from './dispatch';

const feature = await loadFeature('./dispatch.feature');

const SUPABASE_URL = 'https://test.supabase.co';
const SERVICE_ROLE = 'test-service-role';

const mockSendNotification = vi.fn().mockResolvedValue({ statusCode: 201 });

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: (...args: unknown[]) => mockSendNotification(...args),
  },
}));

const SUB_1 = {
  id: 'sub-1',
  user_id: 'user-1',
  endpoint: 'https://push.example.com/endpoint/1',
  p256dh: 'p256dh-1',
  auth_key: 'auth-1',
  platform: 'web',
};

const SUB_2 = {
  id: 'sub-2',
  user_id: 'user-2',
  endpoint: 'https://push.example.com/endpoint/2',
  p256dh: 'p256dh-2',
  auth_key: 'auth-2',
  platform: 'web',
};

const ORIGINAL_FETCH = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;
let deletedSubIds: string[] = [];
let logInsertCount = 0;

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
    VAPID_SUBJECT: 'mailto:test@example.com',
    ...overrides,
  } as unknown as Parameters<typeof dispatchNotification>[0];
}

type SubRow = typeof SUB_1;

function makePrefsResponse(prefs: Array<{ user_id: string }>): Response {
  return new Response(JSON.stringify(prefs), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeSubsResponse(subs: SubRow[]): Response {
  return new Response(JSON.stringify(subs), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function setupFetchMock(prefs: Array<{ user_id: string }>, subs: SubRow[]) {
  fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const urlStr = String(url);
    if (urlStr.includes('/notification_prefs')) return Promise.resolve(makePrefsResponse(prefs));
    if (urlStr.includes('/push_subscriptions') && (!init?.method || init.method === 'GET')) {
      return Promise.resolve(makeSubsResponse(subs));
    }
    if (urlStr.includes('/push_subscriptions') && init?.method === 'DELETE') {
      const match = urlStr.match(/id=eq\.([^&]+)/);
      if (match?.[1]) deletedSubIds.push(match[1]);
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    if (urlStr.includes('/notification_log') && init?.method === 'POST') {
      logInsertCount++;
      return Promise.resolve(new Response(null, { status: 201 }));
    }
    return Promise.resolve(new Response('Not found', { status: 404 }));
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
}

const DEADLINE_PAYLOAD = {
  type: 'deadline_reminder',
  title: 'Test',
  body: 'Test body',
  url: 'https://simplyfpl.com/',
} as const;

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  BeforeEachScenario(() => {
    vi.clearAllMocks();
    deletedSubIds = [];
    logInsertCount = 0;
  });

  AfterEachScenario(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  Scenario('Dispatches deadline reminder to subscribed Pro users', ({ Given, When, Then, And }) => {
    let result: Awaited<ReturnType<typeof dispatchNotification>>;

    Given('VAPID keys are configured', () => undefined);
    And('2 users have deadline_reminder enabled in notification_prefs', () => {
      setupFetchMock([{ user_id: 'user-1' }, { user_id: 'user-2' }], [SUB_1, SUB_2]);
    });
    And('both users have a web push subscription', () => undefined);

    When('dispatchNotification is called with event deadline_reminder', async () => {
      result = await dispatchNotification(makeEnv(), {
        event: 'deadline_reminder',
        payload: DEADLINE_PAYLOAD,
      });
    });

    Then('web-push sendNotification is called twice', () => {
      expect(mockSendNotification).toHaveBeenCalledTimes(2);
    });

    And('2 notification_log rows are inserted', () => {
      expect(logInsertCount).toBe(1);
    });

    And('the result is { sent: 2, failed: 0 }', () => {
      expect(result).toEqual({ sent: 2, failed: 0 });
    });
  });

  Scenario('Skips users without the event pref enabled', ({ Given, When, Then, And }) => {
    let result: Awaited<ReturnType<typeof dispatchNotification>>;

    Given('VAPID keys are configured', () => undefined);
    And('1 user has deadline_reminder disabled in notification_prefs', () => {
      setupFetchMock([], []);
    });

    When('dispatchNotification is called with event deadline_reminder', async () => {
      result = await dispatchNotification(makeEnv(), {
        event: 'deadline_reminder',
        payload: DEADLINE_PAYLOAD,
      });
    });

    Then('web-push sendNotification is not called', () => {
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    And('the result is { sent: 0, failed: 0 }', () => {
      expect(result).toEqual({ sent: 0, failed: 0 });
    });
  });

  Scenario('Deletes 410-gone subscriptions', ({ Given, When, Then, And }) => {
    let result: Awaited<ReturnType<typeof dispatchNotification>>;

    Given('VAPID keys are configured', () => undefined);
    And('1 user has deadline_reminder enabled', () => {
      setupFetchMock([{ user_id: 'user-1' }], [SUB_1]);
    });
    And('that user has a stale push subscription', () => undefined);

    When('the push service responds 410 Gone for that subscription', async () => {
      const err = Object.assign(new Error('Gone'), { statusCode: 410 });
      mockSendNotification.mockRejectedValueOnce(err);
      result = await dispatchNotification(makeEnv(), {
        event: 'deadline_reminder',
        payload: DEADLINE_PAYLOAD,
      });
    });

    Then('the subscription row is deleted from Supabase', () => {
      expect(deletedSubIds).toContain('sub-1');
    });

    And('the result is { sent: 0, failed: 1 }', () => {
      expect(result).toEqual({ sent: 0, failed: 1 });
    });
  });

  Scenario('Returns early when VAPID keys are missing', ({ Given, When, Then, And }) => {
    let result: Awaited<ReturnType<typeof dispatchNotification>>;

    Given('VAPID keys are not set', () => undefined);

    When('dispatchNotification is called with event deadline_reminder', async () => {
      result = await dispatchNotification(
        makeEnv({ VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '' }),
        {
          event: 'deadline_reminder',
          payload: DEADLINE_PAYLOAD,
        }
      );
    });

    Then('web-push sendNotification is not called', () => {
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    And('the result is { sent: 0, failed: 0 }', () => {
      expect(result).toEqual({ sent: 0, failed: 0 });
    });
  });

  Scenario('Scopes dispatch to provided user_ids', ({ Given, When, Then, And }) => {
    let result: Awaited<ReturnType<typeof dispatchNotification>>;

    Given('VAPID keys are configured', () => undefined);
    And('3 users have deadline_reminder enabled', () => {
      setupFetchMock([{ user_id: 'user-1' }], [SUB_1]);
    });
    And('all 3 have push subscriptions', () => undefined);

    When(
      'dispatchNotification is called with event deadline_reminder and userIds for 1 of them',
      async () => {
        result = await dispatchNotification(makeEnv(), {
          event: 'deadline_reminder',
          userIds: ['user-1'],
          payload: DEADLINE_PAYLOAD,
        });
      }
    );

    Then('web-push sendNotification is called once', () => {
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });

    And('the result is { sent: 1, failed: 0 }', () => {
      expect(result).toEqual({ sent: 1, failed: 0 });
    });
  });
});
