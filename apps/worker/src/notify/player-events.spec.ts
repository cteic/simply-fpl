import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { describe, expect, it, vi } from 'vitest';

import { detectElementNewEvents, runPlayerEventsCheck } from './player-events';

const feature = await loadFeature('./player-events.feature');

const SUPABASE_URL = 'https://test.supabase.co';
const SERVICE_ROLE = 'test-service-role';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ENTRY_ID = 42;
const GW_ID = 10;

const PLAYER_A_ID = 200;
const PLAYER_B_ID = 300;

const mockSendNotification = vi.fn().mockResolvedValue({ statusCode: 201 });

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: (...args: unknown[]) => mockSendNotification(...args),
  },
}));

function makeEnv(kvStore: Record<string, string> = {}): Parameters<typeof runPlayerEventsCheck>[0] {
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
  } as unknown as Parameters<typeof runPlayerEventsCheck>[0];
}

function makeBootstrap(gwId: number) {
  return JSON.stringify({
    events: [{ id: gwId, is_current: true, finished: false }],
    elements: [
      { id: PLAYER_A_ID, web_name: 'Salah', team: 1, element_type: 3 },
      { id: PLAYER_B_ID, web_name: 'Traoré', team: 2, element_type: 4 },
    ],
  });
}

function makeLiveGw(
  playerAGoals: number,
  playerBAssists: number,
  playerARedCards = 0,
  playerBGoals = 0
) {
  return JSON.stringify({
    elements: [
      {
        id: PLAYER_A_ID,
        stats: {
          goals_scored: playerAGoals,
          assists: 0,
          red_cards: playerARedCards,
          bonus: 0,
          total_points: playerAGoals * 6,
          minutes: 90,
          clean_sheets: 0,
          goals_conceded: 0,
          yellow_cards: 0,
          saves: 0,
          bps: 0,
          clearances_blocks_interceptions: 0,
          tackles: 0,
        },
        explain: [],
      },
      {
        id: PLAYER_B_ID,
        stats: {
          goals_scored: playerBGoals,
          assists: playerBAssists,
          red_cards: 0,
          bonus: 0,
          total_points: playerBAssists * 3 + playerBGoals * 5,
          minutes: 90,
          clean_sheets: 0,
          goals_conceded: 0,
          yellow_cards: 0,
          saves: 0,
          bps: 0,
          clearances_blocks_interceptions: 0,
          tackles: 0,
        },
        explain: [],
      },
    ],
  });
}

function makePicks(captainId: number) {
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
    picks: [
      {
        element: PLAYER_A_ID,
        position: 11,
        multiplier: captainId === PLAYER_A_ID ? 2 : 1,
        is_captain: captainId === PLAYER_A_ID,
        is_vice_captain: false,
      },
      {
        element: PLAYER_B_ID,
        position: 9,
        multiplier: captainId === PLAYER_B_ID ? 2 : 1,
        is_captain: captainId === PLAYER_B_ID,
        is_vice_captain: false,
      },
    ],
  });
}

function makePrefsResponse(opts: {
  goal_scored?: boolean;
  assist?: boolean;
  red_card?: boolean;
  quiet_hours_start?: number | null;
  quiet_hours_end?: number | null;
}) {
  return JSON.stringify([
    {
      user_id: USER_ID,
      goal_scored: opts.goal_scored ?? true,
      assist: opts.assist ?? true,
      red_card: opts.red_card ?? true,
      quiet_hours_start: opts.quiet_hours_start ?? null,
      quiet_hours_end: opts.quiet_hours_end ?? null,
    },
  ]);
}

const ORIGINAL_FETCH = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;

function setupFetchMock(
  prefsResponse: string,
  includeUserInPlayerEventPrefs = true,
  subscriptionEndpoint = 'https://push.googleapis.com/test/1'
) {
  fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const urlStr = String(url);
    if (urlStr.includes('/notification_prefs') && urlStr.includes('or=(goal_scored')) {
      return Promise.resolve(
        new Response(
          includeUserInPlayerEventPrefs ? JSON.stringify([{ user_id: USER_ID }]) : '[]',
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    }
    if (urlStr.includes('/profiles')) {
      return Promise.resolve(
        new Response(
          includeUserInPlayerEventPrefs
            ? JSON.stringify([{ id: USER_ID, fpl_entry_id: ENTRY_ID, tier: 'pro' }])
            : '[]',
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    }
    if (urlStr.includes('/notification_prefs') && urlStr.includes(`user_id=eq.${USER_ID}`)) {
      return Promise.resolve(
        new Response(prefsResponse, {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }
    if (urlStr.includes('/notification_prefs')) {
      return Promise.resolve(
        new Response(
          JSON.stringify([
            {
              user_id: USER_ID,
              quiet_hours_start: null,
              quiet_hours_end: null,
            },
          ]),
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
              user_id: USER_ID,
              platform: 'web',
              endpoint: subscriptionEndpoint,
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

  Scenario('Captain scores a goal and triggers a bundled push', ({ Given, When, Then, And }) => {
    let env: ReturnType<typeof makeEnv>;

    Given('a live tick where the captain scored 1 new goal this tick', () => {
      const prevStats = JSON.stringify({
        [String(PLAYER_A_ID)]: { goals: 0, assists: 0, red_cards: 0 },
        [String(PLAYER_B_ID)]: { goals: 0, assists: 0, red_cards: 0 },
      });
      const kvStore: Record<string, string> = {
        'fpl:/bootstrap-static/': makeBootstrap(GW_ID),
        [`fpl:/event/${GW_ID}/live/`]: makeLiveGw(1, 0),
        [`notify:pstats:gw${GW_ID}`]: prevStats,
        [`fpl:/entry/${ENTRY_ID}/event/${GW_ID}/picks/`]: makePicks(PLAYER_A_ID),
      };
      env = makeEnv(kvStore);
      setupFetchMock(makePrefsResponse({}));
    });

    And('the user has goal_scored enabled in notification_prefs', () => undefined);
    And('quiet hours are not active', () => undefined);

    When('runPlayerEventsCheck is called', async () => {
      await runPlayerEventsCheck(env);
    });

    Then('a push is sent for that user', () => {
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });

    And("the notification mentions the player's name and captain context", () => {
      const call = mockSendNotification.mock.calls[0];
      const payload = JSON.parse(call?.[1] as string) as { title: string; body: string };
      expect(payload.title).toContain('Salah');
    });
  });

  Scenario(
    'Multiple events for different squad players are batched into one push',
    ({ Given, When, Then, And }) => {
      let env: ReturnType<typeof makeEnv>;

      Given('a live tick where player A scored a goal and player B got an assist', () => {
        const prevStats = JSON.stringify({
          [String(PLAYER_A_ID)]: { goals: 0, assists: 0, red_cards: 0 },
          [String(PLAYER_B_ID)]: { goals: 0, assists: 0, red_cards: 0 },
        });
        const kvStore: Record<string, string> = {
          'fpl:/bootstrap-static/': makeBootstrap(GW_ID),
          [`fpl:/event/${GW_ID}/live/`]: makeLiveGw(1, 1),
          [`notify:pstats:gw${GW_ID}`]: prevStats,
          [`fpl:/entry/${ENTRY_ID}/event/${GW_ID}/picks/`]: makePicks(PLAYER_A_ID),
        };
        env = makeEnv(kvStore);
        setupFetchMock(makePrefsResponse({}));
      });

      And('the user has both goal_scored and assist enabled', () => undefined);
      And('quiet hours are not active', () => undefined);

      When('runPlayerEventsCheck is called', async () => {
        await runPlayerEventsCheck(env);
      });

      Then('exactly one push is sent for that user', () => {
        expect(mockSendNotification).toHaveBeenCalledTimes(1);
      });

      And('the notification body mentions both players', () => {
        const call = mockSendNotification.mock.calls[0];
        const payload = JSON.parse(call?.[1] as string) as { body: string };
        expect(payload.body).toContain('Salah');
        expect(payload.body).toContain('Traoré');
      });
    }
  );

  Scenario('Already-notified goals are not re-sent', ({ Given, When, Then, And }) => {
    let env: ReturnType<typeof makeEnv>;

    Given('stored stats show the player already had 1 goal', () => {
      const prevStats = JSON.stringify({
        [String(PLAYER_A_ID)]: { goals: 1, assists: 0, red_cards: 0 },
        [String(PLAYER_B_ID)]: { goals: 0, assists: 0, red_cards: 0 },
      });
      const kvStore: Record<string, string> = {
        'fpl:/bootstrap-static/': makeBootstrap(GW_ID),
        [`fpl:/event/${GW_ID}/live/`]: makeLiveGw(1, 0),
        [`notify:pstats:gw${GW_ID}`]: prevStats,
        [`fpl:/entry/${ENTRY_ID}/event/${GW_ID}/picks/`]: makePicks(PLAYER_A_ID),
      };
      env = makeEnv(kvStore);
      setupFetchMock(makePrefsResponse({}));
    });

    And('the live tick still shows 1 goal (no new goals this tick)', () => undefined);

    When('runPlayerEventsCheck is called', async () => {
      await runPlayerEventsCheck(env);
    });

    Then('no push is sent for that user', () => {
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });

  Scenario('Red card triggers a push regardless of points', ({ Given, When, Then, And }) => {
    let env: ReturnType<typeof makeEnv>;

    Given('a live tick where a squad player received a new red card', () => {
      const prevStats = JSON.stringify({
        [String(PLAYER_A_ID)]: { goals: 0, assists: 0, red_cards: 0 },
        [String(PLAYER_B_ID)]: { goals: 0, assists: 0, red_cards: 0 },
      });
      const kvStore: Record<string, string> = {
        'fpl:/bootstrap-static/': makeBootstrap(GW_ID),
        [`fpl:/event/${GW_ID}/live/`]: makeLiveGw(0, 0, 1),
        [`notify:pstats:gw${GW_ID}`]: prevStats,
        [`fpl:/entry/${ENTRY_ID}/event/${GW_ID}/picks/`]: makePicks(PLAYER_B_ID),
      };
      env = makeEnv(kvStore);
      setupFetchMock(makePrefsResponse({}));
    });

    And('the user has red_card enabled in notification_prefs', () => undefined);
    And('quiet hours are not active', () => undefined);

    When('runPlayerEventsCheck is called', async () => {
      await runPlayerEventsCheck(env);
    });

    Then('a push is sent for that user', () => {
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });
  });

  Scenario('Quiet hours suppress player event notifications', ({ Given, When, Then, And }) => {
    let env: ReturnType<typeof makeEnv>;

    Given('a live tick where a squad player scored a new goal', () => {
      const prevStats = JSON.stringify({
        [String(PLAYER_A_ID)]: { goals: 0, assists: 0, red_cards: 0 },
        [String(PLAYER_B_ID)]: { goals: 0, assists: 0, red_cards: 0 },
      });
      const kvStore: Record<string, string> = {
        'fpl:/bootstrap-static/': makeBootstrap(GW_ID),
        [`fpl:/event/${GW_ID}/live/`]: makeLiveGw(1, 0),
        [`notify:pstats:gw${GW_ID}`]: prevStats,
        [`fpl:/entry/${ENTRY_ID}/event/${GW_ID}/picks/`]: makePicks(PLAYER_B_ID),
      };
      env = makeEnv(kvStore);
      setupFetchMock(makePrefsResponse({ quiet_hours_start: 0, quiet_hours_end: 23 }));
    });

    And('the user has goal_scored enabled', () => undefined);
    And('quiet hours are active (current UTC hour is within the range)', () => undefined);

    When('runPlayerEventsCheck is called', async () => {
      await runPlayerEventsCheck(env);
    });

    Then('no push is sent for that user', () => {
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });

  Scenario(
    'User with goal_scored disabled does not receive goal notifications',
    ({ Given, When, Then, And }) => {
      let env: ReturnType<typeof makeEnv>;

      Given('a live tick where a squad player scored a new goal', () => {
        const prevStats = JSON.stringify({
          [String(PLAYER_A_ID)]: { goals: 0, assists: 0, red_cards: 0 },
          [String(PLAYER_B_ID)]: { goals: 0, assists: 0, red_cards: 0 },
        });
        const kvStore: Record<string, string> = {
          'fpl:/bootstrap-static/': makeBootstrap(GW_ID),
          [`fpl:/event/${GW_ID}/live/`]: makeLiveGw(1, 0),
          [`notify:pstats:gw${GW_ID}`]: prevStats,
          [`fpl:/entry/${ENTRY_ID}/event/${GW_ID}/picks/`]: makePicks(PLAYER_B_ID),
        };
        env = makeEnv(kvStore);
        setupFetchMock(
          makePrefsResponse({ goal_scored: false, assist: false, red_card: false }),
          false
        );
      });

      And('the user has goal_scored disabled in notification_prefs', () => undefined);

      When('runPlayerEventsCheck is called', async () => {
        await runPlayerEventsCheck(env);
      });

      Then('no push is sent for that user', () => {
        expect(mockSendNotification).not.toHaveBeenCalled();
      });
    }
  );

  Scenario(
    'First tick with no previous stats does not trigger notifications',
    ({ Given, When, Then, And }) => {
      let env: ReturnType<typeof makeEnv>;

      Given('no stored stats exist for the current gameweek', () => {
        const kvStore: Record<string, string> = {
          'fpl:/bootstrap-static/': makeBootstrap(GW_ID),
          [`fpl:/event/${GW_ID}/live/`]: makeLiveGw(2, 0),
          [`fpl:/entry/${ENTRY_ID}/event/${GW_ID}/picks/`]: makePicks(PLAYER_A_ID),
        };
        env = makeEnv(kvStore);
        setupFetchMock(makePrefsResponse({}));
      });

      And('the live tick shows a player with 2 goals', () => undefined);

      When('runPlayerEventsCheck is called', async () => {
        await runPlayerEventsCheck(env);
      });

      Then('no push is sent (first-tick baseline established)', () => {
        expect(mockSendNotification).not.toHaveBeenCalled();
      });
    }
  );
});

describe('detectElementNewEvents unit tests', () => {
  it('returns zeroes when no previous stats', () => {
    const result = detectElementNewEvents(null, 2, 1, 0);
    expect(result).toEqual({ newGoals: 0, newAssists: 0, redCard: false });
  });

  it('detects a new goal', () => {
    const result = detectElementNewEvents({ goals: 1, assists: 0, red_cards: 0 }, 2, 0, 0);
    expect(result.newGoals).toBe(1);
    expect(result.newAssists).toBe(0);
    expect(result.redCard).toBe(false);
  });

  it('detects a new assist', () => {
    const result = detectElementNewEvents({ goals: 0, assists: 0, red_cards: 0 }, 0, 1, 0);
    expect(result.newGoals).toBe(0);
    expect(result.newAssists).toBe(1);
  });

  it('detects a red card', () => {
    const result = detectElementNewEvents({ goals: 0, assists: 0, red_cards: 0 }, 0, 0, 1);
    expect(result.redCard).toBe(true);
  });

  it('does not report an already-counted goal', () => {
    const result = detectElementNewEvents({ goals: 2, assists: 0, red_cards: 0 }, 2, 0, 0);
    expect(result.newGoals).toBe(0);
  });
});
