import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

import { PAVAIL_SNAPSHOT_KEY, runPlayerAvailabilityCheck } from './player-availability';

const feature = await loadFeature('./player-availability.feature');

const SUPABASE_URL = 'https://test.supabase.co';
const SERVICE_ROLE = 'test-service-role';

const USER_A_ID = '11111111-1111-4111-8111-111111111111';
const USER_B_ID = '22222222-2222-4222-8222-222222222222';
const ENTRY_ID = 42;
const GW_ID = 10;
const PLAYER_10_ID = 10;
const PLAYER_20_ID = 20;
const PLAYER_30_ID = 30;

const mockSendNotification = vi.fn().mockResolvedValue({ statusCode: 201 });

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: (...args: unknown[]) => mockSendNotification(...args),
  },
}));

function makeBootstrap(
  players: Array<{
    id: number;
    web_name: string;
    status?: string;
    news?: string;
    chance?: number | null;
  }>
) {
  return JSON.stringify({
    events: [{ id: GW_ID, is_current: true, finished: false }],
    elements: players.map((p) => ({
      id: p.id,
      web_name: p.web_name,
      first_name: p.web_name,
      second_name: p.web_name,
      team: 1,
      element_type: 3,
      now_cost: 80,
      total_points: 0,
      event_points: 0,
      selected_by_percent: '5.0',
      transfers_in_event: 0,
      transfers_out_event: 0,
      chance_of_playing_next_round: p.chance ?? 100,
      news: p.news ?? '',
      status: p.status ?? 'a',
    })),
    teams: [{ id: 1, name: 'Arsenal', short_name: 'ARS', code: 3 }],
    element_types: [],
  });
}

function makePicks(elementIds: number[]) {
  return JSON.stringify({
    active_chip: null,
    automatic_subs: [],
    entry_history: {
      event: GW_ID,
      points: 0,
      total_points: 0,
      rank: 1000,
      rank_sort: 1000,
      overall_rank: 5000,
      event_transfers: 0,
      event_transfers_cost: 0,
      points_on_bench: 0,
    },
    picks: elementIds.map((id, i) => ({
      element: id,
      position: i + 1,
      multiplier: 1,
      is_captain: i === 0,
      is_vice_captain: i === 1,
    })),
  });
}

function makeEnv(
  kvStore: Record<string, string> = {}
): Parameters<typeof runPlayerAvailabilityCheck>[0] {
  return {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE: SERVICE_ROLE,
    VAPID_PUBLIC_KEY: 'BTest_PublicKey_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    VAPID_PRIVATE_KEY: 'test-private-key-aaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    VAPID_SUBJECT: 'mailto:test@example.com',
    FPL_CACHE: {
      get: vi.fn((key: string) => Promise.resolve(kvStore[key] ?? null)),
      put: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as Parameters<typeof runPlayerAvailabilityCheck>[0];
}

const ORIGINAL_FETCH = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;

function setupFetchMock(opts: {
  userIds?: string[];
  entryId?: number;
  quietHoursStart?: number | null;
  quietHoursEnd?: number | null;
}) {
  const {
    userIds = [USER_A_ID],
    entryId = ENTRY_ID,
    quietHoursStart = null,
    quietHoursEnd = null,
  } = opts;
  fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const urlStr = String(url);
    if (
      urlStr.includes('/notification_prefs') &&
      urlStr.includes('player_availability_changed=eq.true')
    ) {
      return Promise.resolve(
        new Response(JSON.stringify(userIds.map((id) => ({ user_id: id }))), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }
    if (urlStr.includes('/profiles')) {
      return Promise.resolve(
        new Response(
          JSON.stringify(userIds.map((id) => ({ id, fpl_entry_id: entryId, tier: 'pro' }))),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    }
    if (urlStr.includes('/notification_prefs') && urlStr.includes('quiet_hours_start')) {
      return Promise.resolve(
        new Response(
          JSON.stringify([{ quiet_hours_start: quietHoursStart, quiet_hours_end: quietHoursEnd }]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    }
    if (urlStr.includes('/push_subscriptions') && (!init?.method || init.method === 'GET')) {
      return Promise.resolve(
        new Response(
          JSON.stringify([
            {
              id: 'sub-1',
              user_id: userIds[0],
              platform: 'web',
              endpoint: 'https://push.example.com/1',
              p256dh: 'p256dh-key',
              auth_key: 'auth-key',
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    }
    if (urlStr.includes('/notification_log') && init?.method === 'POST') {
      return Promise.resolve(new Response(null, { status: 201 }));
    }
    return Promise.resolve(new Response('Not found', { status: 404 }));
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
}

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  BeforeEachScenario(() => {
    vi.clearAllMocks();
  });

  AfterEachScenario(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  Scenario('First run writes snapshot and sends no notifications', ({ Given, When, Then, And }) => {
    let env: ReturnType<typeof makeEnv>;

    Given('no previous snapshot exists in KV', () => {
      const kv: Record<string, string> = {
        'fpl:/bootstrap-static/': makeBootstrap([
          { id: PLAYER_10_ID, web_name: 'Saka', status: 'd', news: 'Knock', chance: 75 },
        ]),
      };
      env = makeEnv(kv);
      setupFetchMock({ userIds: [USER_A_ID] });
    });

    And('the bootstrap has one doubtful player', () => {
      // set up in previous step
    });

    When('runPlayerAvailabilityCheck is called', async () => {
      await runPlayerAvailabilityCheck(env);
    });

    Then('the snapshot is written to KV', () => {
      expect(
        (env.FPL_CACHE as unknown as { put: ReturnType<typeof vi.fn> }).put
      ).toHaveBeenCalledWith(
        PAVAIL_SNAPSHOT_KEY,
        expect.any(String),
        expect.objectContaining({ expirationTtl: expect.any(Number) })
      );
    });

    And('no push is sent', () => {
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });

  Scenario(
    'Player newly flagged triggers notification for users with that player',
    ({ Given, When, Then, And }) => {
      let env: ReturnType<typeof makeEnv>;

      Given('a snapshot where player 10 was available', () => {
        const prevSnapshot = JSON.stringify({
          [String(PLAYER_10_ID)]: { status: 'a', news: '', chance: 100 },
        });
        const kv: Record<string, string> = {
          'fpl:/bootstrap-static/': makeBootstrap([
            { id: PLAYER_10_ID, web_name: 'Saka', status: 'd', news: 'Knock', chance: 75 },
          ]),
          [PAVAIL_SNAPSHOT_KEY]: prevSnapshot,
          [`fpl:/entry/${ENTRY_ID}/event/${GW_ID}/picks/`]: makePicks([PLAYER_10_ID]),
        };
        env = makeEnv(kv);
        setupFetchMock({ userIds: [USER_A_ID] });
      });

      And('the bootstrap now shows player 10 as doubtful with news "Knock"', () => {
        // set up in previous step
      });

      And('user A has player 10 in their squad and player_availability_changed enabled', () => {
        // set up in previous step
      });

      When('runPlayerAvailabilityCheck is called', async () => {
        await runPlayerAvailabilityCheck(env);
      });

      Then('a push is sent to user A', () => {
        expect(mockSendNotification).toHaveBeenCalledTimes(1);
      });

      And('the notification title contains the player name', () => {
        const call = mockSendNotification.mock.calls[0];
        const payload = JSON.parse(call?.[1] as string) as { title: string };
        expect(payload.title).toContain('Saka');
      });
    }
  );

  Scenario('Ruled out player triggers notification', ({ Given, When, Then, And }) => {
    let env: ReturnType<typeof makeEnv>;

    Given('a snapshot where player 20 was doubtful', () => {
      const prevSnapshot = JSON.stringify({
        [String(PLAYER_20_ID)]: { status: 'd', news: 'Knock', chance: 50 },
      });
      const kv: Record<string, string> = {
        'fpl:/bootstrap-static/': makeBootstrap([
          { id: PLAYER_20_ID, web_name: 'Havertz', status: 'i', news: 'Muscle injury', chance: 0 },
        ]),
        [PAVAIL_SNAPSHOT_KEY]: prevSnapshot,
        [`fpl:/entry/${ENTRY_ID}/event/${GW_ID}/picks/`]: makePicks([PLAYER_20_ID]),
      };
      env = makeEnv(kv);
      setupFetchMock({ userIds: [USER_A_ID] });
    });

    And('the bootstrap now shows player 20 as injured (status i, 0% chance)', () => {
      // set up in previous step
    });

    And('user A has player 20 in their squad and player_availability_changed enabled', () => {
      // set up in previous step
    });

    When('runPlayerAvailabilityCheck is called', async () => {
      await runPlayerAvailabilityCheck(env);
    });

    Then('a push is sent to user A', () => {
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });

    And('the notification title contains "ruled out"', () => {
      const call = mockSendNotification.mock.calls[0];
      const payload = JSON.parse(call?.[1] as string) as { title: string };
      expect(payload.title).toContain('ruled out');
    });
  });

  Scenario(
    'User without the changed player in squad receives no notification',
    ({ Given, When, Then, And }) => {
      let env: ReturnType<typeof makeEnv>;

      Given('a snapshot where player 10 was available', () => {
        const prevSnapshot = JSON.stringify({
          [String(PLAYER_10_ID)]: { status: 'a', news: '', chance: 100 },
        });
        const kv: Record<string, string> = {
          'fpl:/bootstrap-static/': makeBootstrap([
            { id: PLAYER_10_ID, web_name: 'Saka', status: 'd', news: 'Knock', chance: 75 },
          ]),
          [PAVAIL_SNAPSHOT_KEY]: prevSnapshot,
          [`fpl:/entry/${ENTRY_ID}/event/${GW_ID}/picks/`]: makePicks([PLAYER_20_ID]),
        };
        env = makeEnv(kv);
        setupFetchMock({ userIds: [USER_B_ID] });
      });

      And('the bootstrap now shows player 10 as doubtful', () => {
        // set up in previous step
      });

      And('user B does not have player 10 in their squad', () => {
        // set up in previous step
      });

      When('runPlayerAvailabilityCheck is called', async () => {
        await runPlayerAvailabilityCheck(env);
      });

      Then('no push is sent to user B', () => {
        expect(mockSendNotification).not.toHaveBeenCalled();
      });
    }
  );

  Scenario('Quiet hours suppress availability notifications', ({ Given, When, Then, And }) => {
    let env: ReturnType<typeof makeEnv>;

    Given('a snapshot where player 10 was available', () => {
      const prevSnapshot = JSON.stringify({
        [String(PLAYER_10_ID)]: { status: 'a', news: '', chance: 100 },
      });
      const kv: Record<string, string> = {
        'fpl:/bootstrap-static/': makeBootstrap([
          { id: PLAYER_10_ID, web_name: 'Saka', status: 'd', news: 'Knock', chance: 75 },
        ]),
        [PAVAIL_SNAPSHOT_KEY]: prevSnapshot,
        [`fpl:/entry/${ENTRY_ID}/event/${GW_ID}/picks/`]: makePicks([PLAYER_10_ID]),
      };
      env = makeEnv(kv);
      setupFetchMock({ userIds: [USER_A_ID], quietHoursStart: 0, quietHoursEnd: 23 });
    });

    And('the bootstrap now shows player 10 as doubtful', () => {
      // set up in previous step
    });

    And('user A has player 10 in their squad and player_availability_changed enabled', () => {
      // set up in previous step
    });

    And('user A has quiet hours covering the current UTC hour', () => {
      // set up in previous step
    });

    When('runPlayerAvailabilityCheck is called', async () => {
      await runPlayerAvailabilityCheck(env);
    });

    Then('no push is sent', () => {
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });

  Scenario('No changes between ticks produces no notifications', ({ Given, When, Then, And }) => {
    let env: ReturnType<typeof makeEnv>;

    Given('a snapshot where player 10 was doubtful at 50% chance', () => {
      const prevSnapshot = JSON.stringify({
        [String(PLAYER_10_ID)]: { status: 'd', news: 'Knock', chance: 50 },
      });
      const kv: Record<string, string> = {
        'fpl:/bootstrap-static/': makeBootstrap([
          { id: PLAYER_10_ID, web_name: 'Saka', status: 'd', news: 'Knock', chance: 50 },
        ]),
        [PAVAIL_SNAPSHOT_KEY]: prevSnapshot,
        [`fpl:/entry/${ENTRY_ID}/event/${GW_ID}/picks/`]: makePicks([PLAYER_10_ID]),
      };
      env = makeEnv(kv);
      setupFetchMock({ userIds: [USER_A_ID] });
    });

    And('the bootstrap still shows player 10 as doubtful at 50% chance', () => {
      // set up in previous step
    });

    And('user A has player 10 in their squad and player_availability_changed enabled', () => {
      // set up in previous step
    });

    When('runPlayerAvailabilityCheck is called', async () => {
      await runPlayerAvailabilityCheck(env);
    });

    Then('no push is sent', () => {
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });

  Scenario('Upgraded chance of playing triggers notification', ({ Given, When, Then, And }) => {
    let env: ReturnType<typeof makeEnv>;

    Given('a snapshot where player 30 was doubtful at 25% chance', () => {
      const prevSnapshot = JSON.stringify({
        [String(PLAYER_30_ID)]: { status: 'd', news: 'Knock', chance: 25 },
      });
      const kv: Record<string, string> = {
        'fpl:/bootstrap-static/': makeBootstrap([
          {
            id: PLAYER_30_ID,
            web_name: 'Odegaard',
            status: 'd',
            news: 'Knock — improving',
            chance: 75,
          },
        ]),
        [PAVAIL_SNAPSHOT_KEY]: prevSnapshot,
        [`fpl:/entry/${ENTRY_ID}/event/${GW_ID}/picks/`]: makePicks([PLAYER_30_ID]),
      };
      env = makeEnv(kv);
      setupFetchMock({ userIds: [USER_A_ID] });
    });

    And('the bootstrap now shows player 30 still doubtful but at 75% chance', () => {
      // set up in previous step
    });

    And('user A has player 30 in their squad and player_availability_changed enabled', () => {
      // set up in previous step
    });

    When('runPlayerAvailabilityCheck is called', async () => {
      await runPlayerAvailabilityCheck(env);
    });

    Then('a push is sent to user A', () => {
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });

    And('the notification title contains "could feature"', () => {
      const call = mockSendNotification.mock.calls[0];
      const payload = JSON.parse(call?.[1] as string) as { title: string };
      expect(payload.title).toContain('could feature');
    });
  });
});
