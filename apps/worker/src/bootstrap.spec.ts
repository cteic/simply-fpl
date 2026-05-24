import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

import {
  BOOTSTRAP_CACHE_KEY,
  BOOTSTRAP_SLIM_CACHE_KEY,
  BOOTSTRAP_SLIM_TTL_SECONDS,
  BOOTSTRAP_TTL_SECONDS,
  type BootstrapEnv,
  handleBootstrapSlim,
} from './bootstrap';

const feature = await loadFeature('./bootstrap.feature');

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

function rawBootstrapJson(): string {
  return JSON.stringify({
    chips: [{ id: 1, name: 'bboost' }],
    game_settings: { league_join_private_max: 30 },
    phases: [{ id: 1, name: 'Overall' }],
    total_players: 11_000_000,
    element_stats: [{ label: 'Minutes', name: 'minutes' }],
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
        chance_of_playing_next_round: 75,
        news: 'Knock',
        ict_index: '180.5',
        expected_goals: '12.34',
        photo: '118748.jpg',
      },
    ],
    teams: [{ id: 1, name: 'Liverpool', short_name: 'LIV', code: 14, strength: 5 }],
    events: [
      {
        id: 1,
        name: 'Gameweek 1',
        deadline_time: '2025-08-15T17:30:00Z',
        is_current: true,
        is_next: false,
        is_previous: false,
        average_entry_score: 52,
        highest_score: 121,
        finished: false,
        chip_plays: [{ chip_name: 'bboost', num_played: 100 }],
      },
    ],
    element_types: [
      {
        id: 1,
        plural_name: 'Goalkeepers',
        plural_name_short: 'GKP',
        singular_name: 'Goalkeeper',
        singular_name_short: 'GKP',
        squad_select: 2,
      },
    ],
  });
}

const EXPECTED_ELEMENT_KEYS = [
  'id',
  'web_name',
  'first_name',
  'second_name',
  'team',
  'element_type',
  'now_cost',
  'total_points',
  'event_points',
  'selected_by_percent',
  'transfers_in_event',
  'transfers_out_event',
  'chance_of_playing_next_round',
  'news',
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
    'Slim cache hit returns cached payload without recomputing',
    ({ Given, When, Then, And }) => {
      let kv: FakeKv;
      let result: Awaited<ReturnType<typeof handleBootstrapSlim>>;
      const cachedSlim = { elements: [], teams: [], events: [], element_types: [] };

      Given('the slim bootstrap cache is warm', () => {
        kv = makeKv({ [BOOTSTRAP_SLIM_CACHE_KEY]: JSON.stringify(cachedSlim) });
      });

      When('a client requests /fpl/bootstrap-static-slim', async () => {
        const env: BootstrapEnv = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test/api' };
        result = await handleBootstrapSlim(env, makeCtx().ctx);
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

  Scenario(
    'KV bootstrap hit recomputes a slim payload with only rendered fields',
    ({ Given, When, Then, And }) => {
      let kv: FakeKv;
      let ctxBundle: FakeCtx;
      let result: Awaited<ReturnType<typeof handleBootstrapSlim>>;

      Given('the raw bootstrap blob is cached but the slim cache is empty', () => {
        kv = makeKv({ [BOOTSTRAP_CACHE_KEY]: rawBootstrapJson() });
      });

      When('a client requests /fpl/bootstrap-static-slim', async () => {
        ctxBundle = makeCtx();
        const env: BootstrapEnv = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test/api' };
        result = await handleBootstrapSlim(env, ctxBundle.ctx);
      });

      Then('the slim payload exposes exactly the declared element fields', () => {
        expect(result.status).toBe(200);
        expect(result.cache).toBe('MISS');
        if ('error' in result.body) throw new Error('expected slim bootstrap');
        const keys = Object.keys(result.body.elements[0] ?? {});
        expect(keys.sort()).toEqual([...EXPECTED_ELEMENT_KEYS].sort());
        expect(keys).not.toContain('ict_index');
        expect(keys).not.toContain('photo');
      });

      And('the heavy top-level bootstrap blocks are dropped', () => {
        if ('error' in result.body) throw new Error('expected slim bootstrap');
        const topKeys = Object.keys(result.body);
        expect(topKeys).not.toContain('chips');
        expect(topKeys).not.toContain('game_settings');
        expect(topKeys).not.toContain('phases');
        expect(topKeys).not.toContain('element_stats');
        expect(topKeys).not.toContain('total_players');
      });

      And('the slim payload is written back to KV with a 1-hour TTL', async () => {
        await Promise.all(ctxBundle.waiters);
        expect(kv.store.has(BOOTSTRAP_SLIM_CACHE_KEY)).toBe(true);
        expect(kv.ttls.get(BOOTSTRAP_SLIM_CACHE_KEY)).toBe(BOOTSTRAP_SLIM_TTL_SECONDS);
        expect(BOOTSTRAP_SLIM_TTL_SECONDS).toBe(3600);
      });

      And('the upstream FPL API is not called', () => {
        expect(fetchMock).not.toHaveBeenCalled();
      });
    }
  );

  Scenario('KV miss falls back to upstream fetch', ({ Given, When, Then, And }) => {
    let kv: FakeKv;
    let ctxBundle: FakeCtx;
    let result: Awaited<ReturnType<typeof handleBootstrapSlim>>;

    Given('no raw or slim bootstrap is cached', () => {
      kv = makeKv();
      fetchMock.mockResolvedValue(new Response(rawBootstrapJson(), { status: 200 }));
    });

    When('a client requests /fpl/bootstrap-static-slim', async () => {
      ctxBundle = makeCtx();
      const env: BootstrapEnv = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test/api' };
      result = await handleBootstrapSlim(env, ctxBundle.ctx);
    });

    Then('the worker fetches bootstrap-static from upstream', () => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl] = fetchMock.mock.calls[0] ?? [];
      expect(String(calledUrl)).toBe('https://fpl.test/api/bootstrap-static/');
    });

    And('the raw blob is cached with a 1-hour TTL and a slim payload returned', async () => {
      await Promise.all(ctxBundle.waiters);
      expect(result.status).toBe(200);
      if ('error' in result.body) throw new Error('expected slim bootstrap');
      expect(result.body.elements.length).toBe(1);
      expect(kv.ttls.get(BOOTSTRAP_CACHE_KEY)).toBe(BOOTSTRAP_TTL_SECONDS);
    });
  });
});
