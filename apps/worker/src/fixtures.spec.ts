import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

import {
  FIXTURES_CACHE_KEY,
  FIXTURES_SLIM_CACHE_KEY,
  FIXTURES_SLIM_TTL_SECONDS,
  type FixturesEnv,
  handleFixturesSlim,
} from './fixtures';

const feature = await loadFeature('./fixtures.feature');

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

interface FakeCtx {
  ctx: ExecutionContext;
  waiters: Promise<unknown>[];
}

function makeCtx(): FakeCtx {
  const waiters: Promise<unknown>[] = [];
  const ctx = {
    waitUntil(promise: Promise<unknown>): void {
      waiters.push(promise);
    },
    passThroughOnException(): void {
      /* noop */
    },
  } as unknown as ExecutionContext;
  return { ctx, waiters };
}

function rawFixturesJson(): string {
  return JSON.stringify([
    {
      id: 1,
      event: 1,
      started: true,
      finished: true,
      finished_provisional: true,
      kickoff_time: '2025-08-15T19:00:00Z',
      team_h: 1,
      team_a: 2,
      team_h_score: 2,
      team_a_score: 1,
      team_h_difficulty: 3,
      team_a_difficulty: 4,
      code: 2444470,
      pulse_id: 115827,
      minutes: 90,
      stats: [{ identifier: 'bps', a: [], h: [{ value: 30, element: 1 }] }],
    },
    {
      id: 2,
      event: 2,
      started: false,
      finished: false,
      finished_provisional: false,
      kickoff_time: '2025-08-22T19:00:00Z',
      team_h: 2,
      team_a: 1,
      team_h_score: null,
      team_a_score: null,
      team_h_difficulty: 2,
      team_a_difficulty: 5,
      code: 2444471,
      pulse_id: 115828,
      minutes: 0,
      stats: [],
    },
  ]);
}

const EXPECTED_FIXTURE_KEYS = [
  'id',
  'event',
  'started',
  'finished',
  'finished_provisional',
  'kickoff_time',
  'team_h',
  'team_a',
  'team_h_score',
  'team_a_score',
  'team_h_difficulty',
  'team_a_difficulty',
];

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

  Scenario(
    'Full fixtures KV hit recomputes a slim payload without the stats blob',
    ({ Given, When, Then, And }) => {
      let kv: FakeKv;
      let ctxBundle: FakeCtx;
      let result: Awaited<ReturnType<typeof handleFixturesSlim>>;

      Given('the raw fixtures blob is cached but the slim cache is empty', () => {
        kv = makeKv({ [FIXTURES_CACHE_KEY]: rawFixturesJson() });
      });

      When('a client requests /fpl/fixtures-slim', async () => {
        ctxBundle = makeCtx();
        const env: FixturesEnv = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test/api' };
        result = await handleFixturesSlim(env, ctxBundle.ctx);
      });

      Then('each slim fixture exposes exactly the declared FplFixture fields', () => {
        expect(result.status).toBe(200);
        if (!Array.isArray(result.body)) throw new Error('expected slim fixtures array');
        expect(result.body.length).toBe(2);
        const keys = Object.keys(result.body[0] ?? {});
        expect(keys.sort()).toEqual([...EXPECTED_FIXTURE_KEYS].sort());
        expect(keys).not.toContain('stats');
        expect(keys).not.toContain('code');
        expect(keys).not.toContain('minutes');
      });

      And('the slim payload is written back to KV with a 10-minute TTL', async () => {
        await Promise.all(ctxBundle.waiters);
        expect(kv.store.has(FIXTURES_SLIM_CACHE_KEY)).toBe(true);
        expect(kv.ttls.get(FIXTURES_SLIM_CACHE_KEY)).toBe(FIXTURES_SLIM_TTL_SECONDS);
        expect(FIXTURES_SLIM_TTL_SECONDS).toBe(600);
      });

      And('the upstream FPL API is not called', () => {
        expect(fetchMock).not.toHaveBeenCalled();
      });
    }
  );

  Scenario('Event filter returns only that gameweek', ({ Given, When, Then }) => {
    let kv: FakeKv;
    let result: Awaited<ReturnType<typeof handleFixturesSlim>>;

    Given('the raw fixtures blob is cached but the slim cache is empty', () => {
      kv = makeKv({ [FIXTURES_CACHE_KEY]: rawFixturesJson() });
    });

    When('a client requests /fpl/fixtures-slim for gameweek 2', async () => {
      const env: FixturesEnv = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test/api' };
      result = await handleFixturesSlim(env, makeCtx().ctx, 2);
    });

    Then('only fixtures for that gameweek are returned', () => {
      expect(result.status).toBe(200);
      if (!Array.isArray(result.body)) throw new Error('expected slim fixtures array');
      expect(result.body.length).toBe(1);
      expect(result.body[0]?.event).toBe(2);
    });
  });

  Scenario('KV miss falls back to upstream fetch', ({ Given, When, Then, And }) => {
    let kv: FakeKv;
    let ctxBundle: FakeCtx;
    let result: Awaited<ReturnType<typeof handleFixturesSlim>>;

    Given('no raw or slim fixtures are cached', () => {
      kv = makeKv();
      fetchMock.mockResolvedValue(new Response(rawFixturesJson(), { status: 200 }));
    });

    When('a client requests /fpl/fixtures-slim', async () => {
      ctxBundle = makeCtx();
      const env: FixturesEnv = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test/api' };
      result = await handleFixturesSlim(env, ctxBundle.ctx);
    });

    Then('the worker fetches fixtures from upstream', () => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl] = fetchMock.mock.calls[0] ?? [];
      expect(String(calledUrl)).toBe('https://fpl.test/api/fixtures/');
    });

    And('a slim fixtures payload is returned', async () => {
      await Promise.all(ctxBundle.waiters);
      expect(result.status).toBe(200);
      if (!Array.isArray(result.body)) throw new Error('expected slim fixtures array');
      expect(result.body.length).toBe(2);
    });
  });
});
