import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

import {
  FRANK_WEEKLY_CACHE_KEY,
  frankWeeklyCacheKey,
  handleFrankWeekly,
  runFrankWeekly,
} from './weekly-cache';
import type { FrankEnv } from './weekly-cache';

const feature = await loadFeature('./weekly-cache.feature');

interface KvPutOptions {
  expirationTtl?: number;
}

interface FakeKv {
  namespace: KVNamespace;
  store: Map<string, string>;
  ttls: Map<string, number | undefined>;
}

function makeKv(initial: Record<string, string> = {}): FakeKv {
  const store = new Map(Object.entries(initial));
  const ttls = new Map<string, number | undefined>();
  const namespace = {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string, options?: KvPutOptions) => {
      store.set(key, value);
      ttls.set(key, options?.expirationTtl);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
      ttls.delete(key);
    }),
  } as unknown as KVNamespace;
  return { namespace, store, ttls };
}

function rawBootstrapJson(gwId = 10): string {
  return JSON.stringify({
    elements: [
      {
        id: 1,
        web_name: 'Salah',
        first_name: 'Mohamed',
        second_name: 'Salah',
        team: 1,
        element_type: 3,
        now_cost: 135,
        total_points: 180,
        event_points: 12,
        selected_by_percent: '45.0',
        transfers_in_event: 500_000,
        transfers_out_event: 50_000,
        chance_of_playing_next_round: 100,
        news: '',
      },
    ],
    teams: [{ id: 1, name: 'Liverpool', short_name: 'LIV', code: 14 }],
    events: [
      {
        id: gwId,
        name: `Gameweek ${gwId}`,
        deadline_time: '2025-10-01T17:30:00Z',
        is_current: true,
        is_next: false,
        is_previous: false,
        average_entry_score: 55,
        highest_score: 120,
        finished: false,
      },
    ],
    element_types: [
      {
        id: 3,
        plural_name: 'Midfielders',
        plural_name_short: 'MID',
        singular_name: 'Midfielder',
        singular_name_short: 'MID',
      },
    ],
  });
}

function validFrankPayloadJson(): string {
  return JSON.stringify({
    captainCandidates: [{ name: 'Salah', team: 'LIV', reason: 'Home vs weak side.' }],
    transferTargets: [{ name: 'Palmer', team: 'CHE', reason: 'Budget option with good run.' }],
    chipNote: null,
  });
}

const ORIGINAL_FETCH = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  BeforeEachScenario(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  AfterEachScenario(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  Scenario('Cache hit returns stored payload', ({ Given, When, Then, And }) => {
    let frankKv: FakeKv;
    let response: Response;

    const storedPayload = JSON.stringify({
      gameweek: 10,
      generatedAt: '2025-10-01T06:00:00Z',
      captainCandidates: [{ name: 'Salah', team: 'LIV', reason: 'In form.' }],
      transferTargets: [{ name: 'Palmer', team: 'CHE', reason: 'Great fixtures.' }],
      chipNote: null,
    });

    Given('the FRANK_WEEKLY_CACHE contains a valid weekly payload for GW10', () => {
      frankKv = makeKv({ [FRANK_WEEKLY_CACHE_KEY]: storedPayload });
    });

    When('a GET request is made to /frank/weekly', async () => {
      const env = {
        FRANK_WEEKLY_CACHE: frankKv.namespace,
        FPL_CACHE: makeKv().namespace,
        FPL_BASE_URL: 'https://fpl.test/api',
      } as unknown as FrankEnv;
      response = await handleFrankWeekly(env);
    });

    Then('the response status is 200', () => {
      expect(response.status).toBe(200);
    });

    And('the response body contains gameweek 10', async () => {
      const body = (await response.json()) as { gameweek: number };
      expect(body.gameweek).toBe(10);
    });

    And('the response header X-Cache is HIT', () => {
      expect(response.headers.get('X-Cache')).toBe('HIT');
    });
  });

  Scenario('Cache miss returns 404', ({ Given, When, Then, And }) => {
    let frankKv: FakeKv;
    let response: Response;

    Given('the FRANK_WEEKLY_CACHE is empty', () => {
      frankKv = makeKv();
    });

    When('a GET request is made to /frank/weekly', async () => {
      const env = {
        FRANK_WEEKLY_CACHE: frankKv.namespace,
        FPL_CACHE: makeKv().namespace,
        FPL_BASE_URL: 'https://fpl.test/api',
      } as unknown as FrankEnv;
      response = await handleFrankWeekly(env);
    });

    Then('the response status is 404', () => {
      expect(response.status).toBe(404);
    });

    And('the response header X-Cache is MISS', () => {
      expect(response.headers.get('X-Cache')).toBe('MISS');
    });
  });

  Scenario('Weekly cron stores Claude response in KV', ({ Given, When, Then, And }) => {
    let fplKv: FakeKv;
    let frankKv: FakeKv;

    Given('a valid FPL bootstrap in FPL_CACHE for GW10', () => {
      fplKv = makeKv({ 'fpl:/bootstrap-static/': rawBootstrapJson(10) });
      frankKv = makeKv();
    });

    And('the Anthropic API returns a valid Frank payload', () => {
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({
            id: 'msg_test',
            type: 'message',
            role: 'assistant',
            content: [{ type: 'text', text: validFrankPayloadJson() }],
            model: 'claude-haiku-4-5-20251001',
            stop_reason: 'end_turn',
            usage: { input_tokens: 100, output_tokens: 80 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    });

    When('the Frank weekly cron runs', async () => {
      const env = {
        FPL_CACHE: fplKv.namespace,
        FRANK_WEEKLY_CACHE: frankKv.namespace,
        FPL_BASE_URL: 'https://fpl.test/api',
        ANTHROPIC_API_KEY: 'sk-test',
      } as unknown as FrankEnv;
      await runFrankWeekly(env);
    });

    Then('the FRANK_WEEKLY_CACHE contains a weekly payload for GW10', () => {
      expect(frankKv.store.has(FRANK_WEEKLY_CACHE_KEY)).toBe(true);
    });

    And('the stored payload has captainCandidates and transferTargets', () => {
      const raw = frankKv.store.get(FRANK_WEEKLY_CACHE_KEY);
      expect(raw).toBeDefined();
      if (raw === undefined) throw new Error('expected frank cache entry');
      const parsed = JSON.parse(raw) as {
        captainCandidates: unknown[];
        transferTargets: unknown[];
      };
      expect(Array.isArray(parsed.captainCandidates)).toBe(true);
      expect(Array.isArray(parsed.transferTargets)).toBe(true);
    });
  });

  Scenario(
    'Free and Pro tiers are both served the cached weekly payload',
    ({ Given, When, Then, And }) => {
      let frankKv: FakeKv;
      let response: Response;

      const storedPayload = JSON.stringify({
        gameweek: 10,
        generatedAt: '2025-10-01T06:00:00Z',
        captainCandidates: [{ name: 'Salah', team: 'LIV', reason: 'In form.' }],
        transferTargets: [{ name: 'Palmer', team: 'CHE', reason: 'Great fixtures.' }],
        chipNote: null,
      });

      Given('the FRANK_WEEKLY_CACHE contains a valid weekly payload for GW10', () => {
        frankKv = makeKv({ [FRANK_WEEKLY_CACHE_KEY]: storedPayload });
      });

      When('a GET request is made to /frank/weekly', async () => {
        const env = {
          FRANK_WEEKLY_CACHE: frankKv.namespace,
          FPL_CACHE: makeKv().namespace,
          FPL_BASE_URL: 'https://fpl.test/api',
        } as unknown as FrankEnv;
        response = await handleFrankWeekly(env);
      });

      Then('the response status is 200', () => {
        expect(response.status).toBe(200);
      });

      And('the response header X-Cache is HIT', () => {
        expect(response.headers.get('X-Cache')).toBe('HIT');
      });
    }
  );

  Scenario(
    'Cron writes a gameweek-scoped key with a boundary-safe TTL',
    ({ Given, When, Then, And }) => {
      let fplKv: FakeKv;
      let frankKv: FakeKv;
      const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

      Given('a valid FPL bootstrap in FPL_CACHE for GW10', () => {
        fplKv = makeKv({ 'fpl:/bootstrap-static/': rawBootstrapJson(10) });
        frankKv = makeKv();
      });

      And('the Anthropic API returns a valid Frank payload', () => {
        fetchMock.mockResolvedValue(
          new Response(
            JSON.stringify({
              id: 'msg_test',
              type: 'message',
              role: 'assistant',
              content: [{ type: 'text', text: validFrankPayloadJson() }],
              model: 'claude-haiku-4-5-20251001',
              stop_reason: 'end_turn',
              usage: { input_tokens: 100, output_tokens: 80 },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      });

      When('the Frank weekly cron runs', async () => {
        const env = {
          FPL_CACHE: fplKv.namespace,
          FRANK_WEEKLY_CACHE: frankKv.namespace,
          FPL_BASE_URL: 'https://fpl.test/api',
          ANTHROPIC_API_KEY: 'sk-test',
        } as unknown as FrankEnv;
        await runFrankWeekly(env);
      });

      Then('the FRANK_WEEKLY_CACHE has a gameweek-scoped entry for GW10', () => {
        expect(frankKv.store.has(frankWeeklyCacheKey(10))).toBe(true);
      });

      And('the gameweek-scoped entry TTL is at least 7 days', () => {
        const ttl = frankKv.ttls.get(frankWeeklyCacheKey(10));
        expect(ttl).toBeDefined();
        expect(ttl ?? 0).toBeGreaterThanOrEqual(SEVEN_DAYS_SECONDS);
      });

      And('the latest pointer matches the gameweek-scoped entry', () => {
        expect(frankKv.store.get(FRANK_WEEKLY_CACHE_KEY)).toBe(
          frankKv.store.get(frankWeeklyCacheKey(10))
        );
      });
    }
  );

  Scenario(
    'A new gameweek keeps the previous week available across the boundary',
    ({ Given, When, Then, And }) => {
      let fplKv: FakeKv;
      let frankKv: FakeKv;

      const gw10Payload = JSON.stringify({
        gameweek: 10,
        generatedAt: '2025-10-01T06:00:00Z',
        captainCandidates: [{ name: 'Salah', team: 'LIV', reason: 'In form.' }],
        transferTargets: [{ name: 'Palmer', team: 'CHE', reason: 'Great fixtures.' }],
        chipNote: null,
      });

      Given('the FRANK_WEEKLY_CACHE already holds GW10 advice', () => {
        frankKv = makeKv({
          [FRANK_WEEKLY_CACHE_KEY]: gw10Payload,
          [frankWeeklyCacheKey(10)]: gw10Payload,
        });
      });

      And('a valid FPL bootstrap in FPL_CACHE for GW11', () => {
        fplKv = makeKv({ 'fpl:/bootstrap-static/': rawBootstrapJson(11) });
      });

      And('the Anthropic API returns a valid Frank payload', () => {
        fetchMock.mockResolvedValue(
          new Response(
            JSON.stringify({
              id: 'msg_test',
              type: 'message',
              role: 'assistant',
              content: [{ type: 'text', text: validFrankPayloadJson() }],
              model: 'claude-haiku-4-5-20251001',
              stop_reason: 'end_turn',
              usage: { input_tokens: 100, output_tokens: 80 },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      });

      When('the Frank weekly cron runs', async () => {
        const env = {
          FPL_CACHE: fplKv.namespace,
          FRANK_WEEKLY_CACHE: frankKv.namespace,
          FPL_BASE_URL: 'https://fpl.test/api',
          ANTHROPIC_API_KEY: 'sk-test',
        } as unknown as FrankEnv;
        await runFrankWeekly(env);
      });

      Then('the latest pointer now serves GW11', () => {
        const raw = frankKv.store.get(FRANK_WEEKLY_CACHE_KEY);
        expect(raw).toBeDefined();
        if (raw === undefined) throw new Error('expected latest frank cache entry');
        const parsed = JSON.parse(raw) as { gameweek: number };
        expect(parsed.gameweek).toBe(11);
      });

      And('the GW10 gameweek-scoped entry is still present', () => {
        expect(frankKv.store.has(frankWeeklyCacheKey(10))).toBe(true);
      });
    }
  );
});
