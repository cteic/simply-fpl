import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

import type { FplBootstrapStatic, FplPlayer } from '@simplyfpl/types';

import {
  BOOTSTRAP_CACHE_KEY,
  BOOTSTRAP_TTL_SECONDS,
  FIXTURES_CACHE_KEY,
  FIXTURES_TTL_SECONDS,
  PRICES_SLIM_CACHE_KEY,
  PRICES_SLIM_TTL_SECONDS,
  type PricesEnv,
  type SlimPricesResponse,
  handlePrices,
  warmPricesCache,
} from './prices';

const feature = await loadFeature('./prices.feature');

interface KvPutOptions {
  expirationTtl?: number;
}

interface FakeKv {
  namespace: KVNamespace;
  store: Map<string, string>;
  ttls: Map<string, number | undefined>;
}

function makePlayer(overrides: Partial<FplPlayer> = {}): FplPlayer {
  return {
    id: 1,
    web_name: 'Salah',
    first_name: 'Mohamed',
    second_name: 'Salah',
    team: 1,
    element_type: 3,
    now_cost: 135,
    total_points: 180,
    event_points: 12,
    selected_by_percent: '10.0',
    transfers_in_event: 250_000,
    transfers_out_event: 0,
    chance_of_playing_next_round: null,
    news: '',
    ...overrides,
  };
}

function makeBootstrap(players: FplPlayer[] = [makePlayer()]): FplBootstrapStatic {
  return {
    elements: players,
    teams: [{ id: 1, name: 'Liverpool', short_name: 'LIV', code: 14 }],
    events: [],
    element_types: [],
  };
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
    'Slim cache hit returns cached payload without recomputing',
    ({ Given, When, Then, And }) => {
      let kv: FakeKv;
      let result: Awaited<ReturnType<typeof handlePrices>>;

      const cachedSlim: SlimPricesResponse = {
        generated_at: '2026-05-19T00:00:00.000Z',
        changes: [
          {
            id: 1,
            web_name: 'Salah',
            element_type: 3,
            team_name: 'Liverpool',
            now_cost: 135,
            ownership: 45.5,
            direction: 'rise',
            probability: 0.9,
          },
        ],
      };

      Given('the slim prices cache is warm', () => {
        kv = makeKv({ [PRICES_SLIM_CACHE_KEY]: JSON.stringify(cachedSlim) });
      });

      When('a client requests /fpl/prices', async () => {
        const env: PricesEnv = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test/api' };
        result = await handlePrices(env, makeCtx().ctx);
      });

      Then('the worker returns the cached slim payload', () => {
        expect(result.status).toBe(200);
        expect(result.cache).toBe('HIT');
        expect(result.body).toEqual(cachedSlim);
      });

      And('the upstream FPL API is not called', () => {
        expect(fetchMock).not.toHaveBeenCalled();
      });
    }
  );

  Scenario('KV bootstrap hit recomputes slim payload', ({ Given, When, Then, And }) => {
    let kv: FakeKv;
    let ctxBundle: FakeCtx;
    let result: Awaited<ReturnType<typeof handlePrices>>;

    Given('the bootstrap-static blob is cached but the slim prices cache is empty', () => {
      kv = makeKv({ [BOOTSTRAP_CACHE_KEY]: JSON.stringify(makeBootstrap()) });
    });

    When('a client requests /fpl/prices', async () => {
      ctxBundle = makeCtx();
      const env: PricesEnv = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test/api' };
      result = await handlePrices(env, ctxBundle.ctx);
    });

    Then('the worker computes a fresh slim payload from the cached bootstrap', () => {
      expect(result.status).toBe(200);
      expect(result.cache).toBe('MISS');
      const body = result.body as SlimPricesResponse;
      expect(body.changes.length).toBeGreaterThan(0);
      expect(body.changes[0]?.web_name).toBe('Salah');
    });

    And('the slim payload is written back to KV with a 10-minute TTL', async () => {
      await Promise.all(ctxBundle.waiters);
      expect(kv.store.has(PRICES_SLIM_CACHE_KEY)).toBe(true);
      expect(kv.ttls.get(PRICES_SLIM_CACHE_KEY)).toBe(PRICES_SLIM_TTL_SECONDS);
      expect(PRICES_SLIM_TTL_SECONDS).toBe(600);
    });

    And('the upstream FPL API is not called', () => {
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  Scenario('KV miss falls back to upstream fetch', ({ Given, When, Then, And }) => {
    let kv: FakeKv;
    let ctxBundle: FakeCtx;
    let result: Awaited<ReturnType<typeof handlePrices>>;

    Given('no bootstrap or slim payload is cached', () => {
      kv = makeKv();
      fetchMock.mockResolvedValue(new Response(JSON.stringify(makeBootstrap()), { status: 200 }));
    });

    When('a client requests /fpl/prices', async () => {
      ctxBundle = makeCtx();
      const env: PricesEnv = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test/api' };
      result = await handlePrices(env, ctxBundle.ctx);
    });

    Then('the worker fetches bootstrap-static from upstream', () => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl] = fetchMock.mock.calls[0] ?? [];
      expect(String(calledUrl)).toBe('https://fpl.test/api/bootstrap-static/');
    });

    And('the worker computes a slim payload from the upstream response', async () => {
      await Promise.all(ctxBundle.waiters);
      expect(result.status).toBe(200);
      const body = result.body as SlimPricesResponse;
      expect(body.changes.length).toBeGreaterThan(0);
      expect(kv.ttls.get(BOOTSTRAP_CACHE_KEY)).toBe(BOOTSTRAP_TTL_SECONDS);
    });
  });

  Scenario('Malformed bootstrap in KV is recovered from upstream', ({ Given, When, Then, And }) => {
    let kv: FakeKv;
    let result: Awaited<ReturnType<typeof handlePrices>>;

    Given('the bootstrap-static cache contains malformed JSON', () => {
      kv = makeKv({ [BOOTSTRAP_CACHE_KEY]: '{not valid json' });
      fetchMock.mockResolvedValue(new Response(JSON.stringify(makeBootstrap()), { status: 200 }));
    });

    When('a client requests /fpl/prices', async () => {
      const env: PricesEnv = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test/api' };
      result = await handlePrices(env, makeCtx().ctx);
    });

    Then('the worker fetches bootstrap-static from upstream', () => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    And('the worker returns a valid slim payload', () => {
      expect(result.status).toBe(200);
      const body = result.body as SlimPricesResponse;
      expect(body.changes.length).toBeGreaterThan(0);
    });
  });

  Scenario(
    'scheduled() warms bootstrap, fixtures, and slim prices in KV',
    ({ Given, When, Then, And }) => {
      let kv: FakeKv;
      let ctxBundle: FakeCtx;

      Given('the FPL upstream is healthy', () => {
        kv = makeKv();
        fetchMock.mockImplementation(async (url: string) => {
          if (url.endsWith('/bootstrap-static/')) {
            return new Response(JSON.stringify(makeBootstrap()), { status: 200 });
          }
          if (url.endsWith('/fixtures/')) {
            return new Response('[]', { status: 200 });
          }
          return new Response('unexpected', { status: 500 });
        });
      });

      When('the cron scheduler triggers warmPricesCache', async () => {
        ctxBundle = makeCtx();
        const env: PricesEnv = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test/api' };
        await warmPricesCache(env, ctxBundle.ctx);
        await Promise.all(ctxBundle.waiters);
      });

      Then('the bootstrap-static blob is written to KV with a 1-hour TTL', () => {
        expect(kv.store.has(BOOTSTRAP_CACHE_KEY)).toBe(true);
        expect(kv.ttls.get(BOOTSTRAP_CACHE_KEY)).toBe(BOOTSTRAP_TTL_SECONDS);
        expect(BOOTSTRAP_TTL_SECONDS).toBe(3600);
      });

      And('the fixtures blob is written to KV with a 10-minute TTL', () => {
        expect(kv.store.has(FIXTURES_CACHE_KEY)).toBe(true);
        expect(kv.ttls.get(FIXTURES_CACHE_KEY)).toBe(FIXTURES_TTL_SECONDS);
        expect(FIXTURES_TTL_SECONDS).toBe(600);
      });

      And('the slim prices payload is written to KV with a 10-minute TTL', () => {
        expect(kv.store.has(PRICES_SLIM_CACHE_KEY)).toBe(true);
        expect(kv.ttls.get(PRICES_SLIM_CACHE_KEY)).toBe(PRICES_SLIM_TTL_SECONDS);
      });
    }
  );
});
