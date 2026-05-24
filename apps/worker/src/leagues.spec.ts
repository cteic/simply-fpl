import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

import {
  LEAGUE_SUMMARY_TTL_SECONDS,
  type LeaguesEnv,
  handleLeagueSummary,
  leagueSummaryCacheKey,
} from './leagues';

const feature = await loadFeature('./leagues.feature');

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

function rawLeagueJson(): string {
  return JSON.stringify({
    new_entries: { has_next: false, page: 1, results: [{ entry: 99, joined_time: 'x' }] },
    last_updated_data: '2026-01-01T12:00:00Z',
    league: {
      id: 314,
      name: 'Overall',
      created: '2025-07-01T00:00:00Z',
      closed: false,
      max_entries: null,
      league_type: 'x',
      scoring: 'c',
      admin_entry: null,
      start_event: 1,
      code_privacy: 'p',
      has_cup: true,
      cup_league: null,
      rank: null,
    },
    standings: {
      has_next: true,
      page: 1,
      results: [
        {
          id: 1,
          event_total: 52,
          player_name: 'Test Manager',
          rank: 1,
          last_rank: 2,
          rank_sort: 1,
          total: 800,
          entry: 12345,
          entry_name: 'Test FC',
        },
      ],
    },
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

  Scenario('Cache hit returns cached summary without refetching', ({ Given, When, Then, And }) => {
    let kv: FakeKv;
    let result: Awaited<ReturnType<typeof handleLeagueSummary>>;
    const cached = {
      league: { id: 314, name: 'Overall' },
      standings: { has_next: false, page: 1, results: [] },
    };

    Given('the league summary cache is warm', () => {
      kv = makeKv({ [leagueSummaryCacheKey(314, 1)]: JSON.stringify(cached) });
    });

    When('a client requests /fpl/leagues/314/summary', async () => {
      const env: LeaguesEnv = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test/api' };
      result = await handleLeagueSummary(env, makeCtx().ctx, 314, 1);
    });

    Then('the worker returns the cached summary', () => {
      expect(result.status).toBe(200);
      expect(result.cache).toBe('HIT');
      expect(result.body).toEqual(cached);
    });

    And('the upstream FPL API is not called', () => {
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  Scenario('Upstream fetch projects to the slim league shape', ({ Given, When, Then, And }) => {
    let kv: FakeKv;
    let ctxBundle: FakeCtx;
    let result: Awaited<ReturnType<typeof handleLeagueSummary>>;

    Given('no league summary is cached', () => {
      kv = makeKv();
      fetchMock.mockResolvedValue(new Response(rawLeagueJson(), { status: 200 }));
    });

    When('a client requests /fpl/leagues/314/summary', async () => {
      ctxBundle = makeCtx();
      const env: LeaguesEnv = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test/api' };
      result = await handleLeagueSummary(env, ctxBundle.ctx, 314, 1);
    });

    Then('the worker fetches the classic-league standings from upstream', () => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl] = fetchMock.mock.calls[0] ?? [];
      expect(String(calledUrl)).toBe(
        'https://fpl.test/api/leagues-classic/314/standings/?page_standings=1'
      );
    });

    And('the slim summary keeps the standings but drops new_entries and metadata', async () => {
      await Promise.all(ctxBundle.waiters);
      expect(result.status).toBe(200);
      if ('error' in result.body) throw new Error('expected slim league');
      expect(result.body.league.name).toBe('Overall');
      expect(result.body.standings.results[0]?.entry).toBe(12345);
      const topKeys = Object.keys(result.body);
      expect(topKeys).not.toContain('new_entries');
      expect(topKeys).not.toContain('last_updated_data');
      expect(Object.keys(result.body.league)).not.toContain('has_cup');
    });

    And('the slim summary is written to KV with a 90-second TTL', () => {
      expect(kv.ttls.get(leagueSummaryCacheKey(314, 1))).toBe(LEAGUE_SUMMARY_TTL_SECONDS);
      expect(LEAGUE_SUMMARY_TTL_SECONDS).toBe(90);
    });
  });

  Scenario('Upstream error is surfaced to the client', ({ Given, When, Then }) => {
    let kv: FakeKv;
    let result: Awaited<ReturnType<typeof handleLeagueSummary>>;

    Given('the upstream returns a 404', () => {
      kv = makeKv();
      fetchMock.mockResolvedValue(new Response('not found', { status: 404 }));
    });

    When('a client requests /fpl/leagues/999/summary', async () => {
      const env: LeaguesEnv = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test/api' };
      result = await handleLeagueSummary(env, makeCtx().ctx, 999, 1);
    });

    Then('the worker returns the upstream error status', () => {
      expect(result.status).toBe(404);
      expect('error' in result.body).toBe(true);
    });
  });
});
