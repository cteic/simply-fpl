import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { describe, expect, it, vi } from 'vitest';

import { evaluateLeagueRankAlert, runLeagueRankAlertCheck } from './league-rank-alert';

const feature = await loadFeature('./league-rank-alert.feature');

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ENTRY_ID = 42;
const GW_ID = 10;
const LEAGUE_ID = 1234;

const mockSendNotification = vi.fn().mockResolvedValue({ statusCode: 201 });

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: (...args: unknown[]) => mockSendNotification(...args),
  },
}));

function makeBootstrap() {
  return JSON.stringify({
    events: [{ id: GW_ID, is_current: true, finished: false }],
    elements: [],
    teams: [],
    element_types: [],
  });
}

function makeLeagueStandings(entryRank: number, includeEntry = true) {
  const results = includeEntry
    ? [
        {
          id: 1,
          entry: ENTRY_ID,
          entry_name: 'Test FC',
          player_name: 'Pete',
          rank: entryRank,
          last_rank: entryRank + 2,
          rank_sort: entryRank,
          total: 500,
          event_total: 60,
        },
        {
          id: 2,
          entry: 99,
          entry_name: 'Other FC',
          player_name: 'Bob',
          rank: entryRank === 1 ? 2 : 1,
          last_rank: 1,
          rank_sort: entryRank === 1 ? 2 : 1,
          total: 510,
          event_total: 62,
        },
      ]
    : [
        {
          id: 2,
          entry: 99,
          entry_name: 'Other FC',
          player_name: 'Bob',
          rank: 1,
          last_rank: 1,
          rank_sort: 1,
          total: 510,
          event_total: 62,
        },
      ];

  return JSON.stringify({
    league: {
      id: LEAGUE_ID,
      name: 'Work League',
      created: '2024-08-01T00:00:00Z',
      admin_entry: 99,
      start_event: 1,
      league_type: 'x',
    },
    standings: { has_next: false, page: 1, results },
  });
}

const ORIGINAL_FETCH = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;
let putCalls: Array<{ key: string; value: string }> = [];

function makeEnv(
  kvStore: Record<string, string> = {},
  kvPutFn?: (key: string, value: string) => void
): Parameters<typeof runLeagueRankAlertCheck>[0] {
  return {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE: 'test-service-role',
    VAPID_PUBLIC_KEY: 'BTest_PublicKey_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    VAPID_PRIVATE_KEY: 'test-private-key-aaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    VAPID_SUBJECT: 'mailto:test@example.com',
    FPL_CACHE: {
      get: vi.fn((key: string) => Promise.resolve(kvStore[key] ?? null)),
      put: vi.fn((key: string, value: string) => {
        if (kvPutFn) kvPutFn(key, value);
        putCalls.push({ key, value });
        return Promise.resolve();
      }),
    },
  } as unknown as Parameters<typeof runLeagueRankAlertCheck>[0];
}

function setupFetchMock(
  alertSubs: Array<{
    user_id: string;
    league_id: number;
    top_n: number | null;
    swing_n: number | null;
  }>,
  includeUserAsProMember = true
) {
  fetchMock = vi.fn((url: string) => {
    const urlStr = String(url);
    if (urlStr.includes('/league_rank_alert_subs')) {
      return Promise.resolve(
        new Response(JSON.stringify(alertSubs), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }
    if (urlStr.includes('/profiles')) {
      return Promise.resolve(
        new Response(
          includeUserAsProMember
            ? JSON.stringify([{ id: USER_ID, fpl_entry_id: ENTRY_ID, tier: 'pro' }])
            : '[]',
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    }
    if (urlStr.includes('/notification_prefs')) {
      return Promise.resolve(
        new Response(JSON.stringify([{ quiet_hours_start: null, quiet_hours_end: null }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }
    if (urlStr.includes('/push_subscriptions')) {
      return Promise.resolve(
        new Response(
          JSON.stringify([
            {
              id: 'sub-1',
              user_id: USER_ID,
              platform: 'web',
              endpoint: 'https://push.googleapis.com/test/1',
              p256dh: 'p256dh-key',
              auth_key: 'auth-key',
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    }
    if (urlStr.includes('/notification_log')) {
      return Promise.resolve(new Response(null, { status: 201 }));
    }
    return Promise.resolve(new Response('Not found', { status: 404 }));
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
}

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  BeforeEachScenario(() => {
    vi.clearAllMocks();
    putCalls = [];
  });

  AfterEachScenario(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  Scenario('User enters top N for the first time', ({ Given, When, Then, And }) => {
    let env: ReturnType<typeof makeEnv>;

    Given('a user has a league alert sub with top_n of 3 for league 1234', () => {
      const kvStore: Record<string, string> = {
        'fpl:/bootstrap-static/': makeBootstrap(),
        [`fpl:/leagues-classic/${LEAGUE_ID}/standings/`]: makeLeagueStandings(2),
      };
      env = makeEnv(kvStore);
      setupFetchMock([{ user_id: USER_ID, league_id: LEAGUE_ID, top_n: 3, swing_n: null }]);
    });

    And('their current rank in league 1234 is 2 (inside top 3)', () => undefined);
    And('no previous rank is stored (first evaluation)', () => undefined);

    When('runLeagueRankAlertCheck is called', async () => {
      await runLeagueRankAlertCheck(env);
    });

    Then('a push is sent notifying the user they entered top 3', () => {
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
      const call = mockSendNotification.mock.calls[0];
      const payload = JSON.parse(call?.[1] as string) as { body: string };
      expect(payload.body).toContain('rank 2');
    });
  });

  Scenario('User falls out of top N', ({ Given, When, Then }) => {
    let env: ReturnType<typeof makeEnv>;

    Given('a user has a league alert sub with top_n of 3 for league 1234', () => {
      const prevRank = JSON.stringify({ rank: 2, notifiedTopN: true });
      const kvStore: Record<string, string> = {
        'fpl:/bootstrap-static/': makeBootstrap(),
        [`fpl:/leagues-classic/${LEAGUE_ID}/standings/`]: makeLeagueStandings(4),
        [`notify:lrank:${USER_ID}:${LEAGUE_ID}:gw${GW_ID}`]: prevRank,
      };
      env = makeEnv(kvStore);
      setupFetchMock([{ user_id: USER_ID, league_id: LEAGUE_ID, top_n: 3, swing_n: null }]);
    });

    When('runLeagueRankAlertCheck is called', async () => {
      await runLeagueRankAlertCheck(env);
    });

    Then('a push is sent notifying the user they left top 3', () => {
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
      const call = mockSendNotification.mock.calls[0];
      const payload = JSON.parse(call?.[1] as string) as { body: string };
      expect(payload.body).toContain('rank 4');
    });
  });

  Scenario('Rank change meets swing_n threshold', ({ Given, When, Then }) => {
    let env: ReturnType<typeof makeEnv>;

    Given('a user has a league alert sub with swing_n of 5 for league 1234', () => {
      const prevRank = JSON.stringify({ rank: 3, notifiedTopN: false });
      const kvStore: Record<string, string> = {
        'fpl:/bootstrap-static/': makeBootstrap(),
        [`fpl:/leagues-classic/${LEAGUE_ID}/standings/`]: makeLeagueStandings(10),
        [`notify:lrank:${USER_ID}:${LEAGUE_ID}:gw${GW_ID}`]: prevRank,
      };
      env = makeEnv(kvStore);
      setupFetchMock([{ user_id: USER_ID, league_id: LEAGUE_ID, top_n: null, swing_n: 5 }]);
    });

    When('runLeagueRankAlertCheck is called', async () => {
      await runLeagueRankAlertCheck(env);
    });

    Then('a push is sent notifying the user of a rank change of 7 places', () => {
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });
  });

  Scenario('Rank change below swing_n threshold does not trigger', ({ Given, When, Then }) => {
    let env: ReturnType<typeof makeEnv>;

    Given('a user has a league alert sub with swing_n of 5 for league 1234', () => {
      const prevRank = JSON.stringify({ rank: 9, notifiedTopN: false });
      const kvStore: Record<string, string> = {
        'fpl:/bootstrap-static/': makeBootstrap(),
        [`fpl:/leagues-classic/${LEAGUE_ID}/standings/`]: makeLeagueStandings(10),
        [`notify:lrank:${USER_ID}:${LEAGUE_ID}:gw${GW_ID}`]: prevRank,
      };
      env = makeEnv(kvStore);
      setupFetchMock([{ user_id: USER_ID, league_id: LEAGUE_ID, top_n: null, swing_n: 5 }]);
    });

    When('runLeagueRankAlertCheck is called', async () => {
      await runLeagueRankAlertCheck(env);
    });

    Then('no push is sent for that user', () => {
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });

  Scenario('Stored rank is updated after evaluation', ({ Given, When, Then, And }) => {
    let env: ReturnType<typeof makeEnv>;

    Given('a user has a league alert sub with top_n of 3 for league 1234', () => {
      const prevRank = JSON.stringify({ rank: 6, notifiedTopN: false });
      const kvStore: Record<string, string> = {
        'fpl:/bootstrap-static/': makeBootstrap(),
        [`fpl:/leagues-classic/${LEAGUE_ID}/standings/`]: makeLeagueStandings(5),
        [`notify:lrank:${USER_ID}:${LEAGUE_ID}:gw${GW_ID}`]: prevRank,
      };
      env = makeEnv(kvStore);
      setupFetchMock([{ user_id: USER_ID, league_id: LEAGUE_ID, top_n: 3, swing_n: null }]);
    });

    When('runLeagueRankAlertCheck is called', async () => {
      await runLeagueRankAlertCheck(env);
    });

    Then('no push is sent', () => {
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    And('the stored rank is updated to 5', () => {
      const rankPut = putCalls.find((c) => c.key.startsWith('notify:lrank:'));
      expect(rankPut).toBeDefined();
      const stored = JSON.parse(rankPut?.value ?? '{}') as { rank: number };
      expect(stored.rank).toBe(5);
    });
  });

  Scenario('User not in league standings page 1 is skipped gracefully', ({ Given, When, Then }) => {
    let env: ReturnType<typeof makeEnv>;

    Given('a user has a league alert sub for league 1234', () => {
      const kvStore: Record<string, string> = {
        'fpl:/bootstrap-static/': makeBootstrap(),
        [`fpl:/leagues-classic/${LEAGUE_ID}/standings/`]: makeLeagueStandings(5, false),
      };
      env = makeEnv(kvStore);
      setupFetchMock([{ user_id: USER_ID, league_id: LEAGUE_ID, top_n: 3, swing_n: null }]);
    });

    When('runLeagueRankAlertCheck is called', async () => {
      await runLeagueRankAlertCheck(env);
    });

    Then('no push is sent for that user', () => {
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });
});

describe('evaluateLeagueRankAlert unit tests', () => {
  it('triggers on first tick when inside top N', () => {
    const result = evaluateLeagueRankAlert({ top_n: 5, swing_n: null }, 3, null);
    expect(result.shouldAlert).toBe(true);
    expect(result.reason).toContain('entered');
    expect(result.notifiedTopN).toBe(true);
  });

  it('does not trigger on first tick when outside top N', () => {
    const result = evaluateLeagueRankAlert({ top_n: 5, swing_n: null }, 6, null);
    expect(result.shouldAlert).toBe(false);
  });

  it('triggers when entering top N from outside', () => {
    const result = evaluateLeagueRankAlert({ top_n: 5, swing_n: null }, 3, {
      rank: 6,
      notifiedTopN: false,
    });
    expect(result.shouldAlert).toBe(true);
    expect(result.notifiedTopN).toBe(true);
  });

  it('triggers when leaving top N', () => {
    const result = evaluateLeagueRankAlert({ top_n: 5, swing_n: null }, 6, {
      rank: 3,
      notifiedTopN: true,
    });
    expect(result.shouldAlert).toBe(true);
    expect(result.notifiedTopN).toBe(false);
  });

  it('does not trigger when staying inside top N', () => {
    const result = evaluateLeagueRankAlert({ top_n: 5, swing_n: null }, 4, {
      rank: 3,
      notifiedTopN: true,
    });
    expect(result.shouldAlert).toBe(false);
    expect(result.notifiedTopN).toBe(true);
  });

  it('triggers on swing_n threshold exactly', () => {
    const result = evaluateLeagueRankAlert({ top_n: null, swing_n: 5 }, 10, {
      rank: 5,
      notifiedTopN: false,
    });
    expect(result.shouldAlert).toBe(true);
  });

  it('does not trigger when swing is below threshold', () => {
    const result = evaluateLeagueRankAlert({ top_n: null, swing_n: 5 }, 8, {
      rank: 5,
      notifiedTopN: false,
    });
    expect(result.shouldAlert).toBe(false);
  });
});
