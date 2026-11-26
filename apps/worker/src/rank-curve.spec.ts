import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

import { RANK_CURVE_SAMPLE_PAGES } from '@simplyfpl/fpl-client';
import type { FplBootstrapStatic, FplEvent, RankCurve } from '@simplyfpl/types';

import {
  RANK_CURVE_TTL_SECONDS,
  type RankCurveEnv,
  handleRankCurve,
  latestSettledEvent,
  rankCurveCacheKey,
} from './rank-curve';

const feature = await loadFeature('./rank-curve.feature');

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

function makeCtx(): { ctx: ExecutionContext; waiters: Promise<unknown>[] } {
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

function makeEvent(overrides: Partial<FplEvent> & { id: number }): FplEvent {
  return {
    name: `Gameweek ${overrides.id}`,
    deadline_time: '2026-11-21T11:00:00Z',
    is_current: false,
    is_next: false,
    is_previous: false,
    average_entry_score: 35,
    highest_score: 106,
    finished: false,
    ...overrides,
  };
}

/** GW11 settled, GW12 next: the real shape on 2026-11-26. */
function settledBootstrap(): FplBootstrapStatic {
  return {
    elements: [],
    teams: [],
    element_types: [],
    events: [
      makeEvent({ id: 10, finished: true, data_checked: true, ranked_count: 11_202_046 }),
      makeEvent({
        id: 11,
        finished: true,
        data_checked: true,
        is_current: true,
        ranked_count: 11_261_396,
      }),
      makeEvent({ id: 12, is_next: true, average_entry_score: 0, ranked_count: 0 }),
    ],
  };
}

function unsettledBootstrap(): FplBootstrapStatic {
  return {
    elements: [],
    teams: [],
    element_types: [],
    events: [makeEvent({ id: 1, is_current: true, finished: false, data_checked: false })],
  };
}

const ORIGINAL_FETCH = globalThis.fetch;

/** A plausible page: deeper pages hold worse ranks on fewer points. */
function pageBody(page: number): string {
  const rank = (page - 1) * 50 + 1;
  const total = Math.max(1, 860 - Math.round(Math.log10(page + 1) * 150));
  return JSON.stringify({ standings: { results: [{ rank, total }] } });
}

describeFeature(feature, ({ Scenario, AfterEachScenario }) => {
  AfterEachScenario(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  Scenario('The settled gameweek is the one FPL has finished checking', ({ Given, When, Then }) => {
    let bootstrap: FplBootstrapStatic;
    let settled: FplEvent | null;

    Given('a bootstrap where GW11 is finished and checked while GW12 is next', () => {
      bootstrap = settledBootstrap();
    });

    When('I ask for the latest settled event', () => {
      settled = latestSettledEvent(bootstrap);
    });

    Then('it is GW11', () => {
      expect(settled?.id).toBe(11);
    });
  });

  Scenario('is_current does not mean in progress', ({ Given, When, Then }) => {
    let bootstrap: FplBootstrapStatic;
    let settled: FplEvent | null;

    Given('a bootstrap where the current gameweek is unfinished', () => {
      bootstrap = unsettledBootstrap();
    });

    When('I ask for the latest settled event', () => {
      settled = latestSettledEvent(bootstrap);
    });

    Then('no settled event is found', () => {
      expect(settled).toBeNull();
    });
  });

  Scenario('Sampling the global league builds a usable curve', ({ Given, And, When, Then }) => {
    let kv: FakeKv;
    let result: Awaited<ReturnType<typeof handleRankCurve>>;

    Given('a bootstrap where GW11 is finished and checked while GW12 is next', () => {
      kv = makeKv({ 'fpl:/bootstrap-static/': JSON.stringify(settledBootstrap()) });
    });

    And('the global league serves a monotonic page for every sampled page', () => {
      globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const page = Number(new URL(url).searchParams.get('page_standings') ?? '1');
        return new Response(pageBody(page), { status: 200 });
      }) as unknown as typeof fetch;
    });

    When('I request the rank curve', async () => {
      const env: RankCurveEnv = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test/api' };
      const { ctx, waiters } = makeCtx();
      result = await handleRankCurve(env, ctx);
      await Promise.all(waiters);
    });

    Then('the curve covers the settled gameweek and the ranked count', () => {
      expect(result.status).toBe(200);
      if ('error' in result.body) throw new Error('expected a curve');
      expect(result.body.gw).toBe(11);
      expect(result.body.rankedCount).toBe(11_261_396);
      expect(result.body.points.length).toBeGreaterThan(8);
    });

    And('the curve points descend by total and ascend by rank', () => {
      if ('error' in result.body) throw new Error('expected a curve');
      const { points } = result.body;
      for (let i = 1; i < points.length; i += 1) {
        const prev = points[i - 1];
        const curr = points[i];
        if (!prev || !curr) throw new Error('curve points must be defined');
        expect(curr.totalPoints).toBeLessThan(prev.totalPoints);
        expect(curr.rank).toBeGreaterThan(prev.rank);
      }
    });

    And("the curve is cached under the gameweek's own key", () => {
      expect(kv.store.has(rankCurveCacheKey(11))).toBe(true);
      expect(kv.ttls.get(rankCurveCacheKey(11))).toBe(RANK_CURVE_TTL_SECONDS);
    });
  });

  Scenario('A cached curve is served without touching upstream', ({ Given, And, When, Then }) => {
    let kv: FakeKv;
    let fetchMock: ReturnType<typeof vi.fn>;
    let result: Awaited<ReturnType<typeof handleRankCurve>>;

    const cachedCurve: RankCurve = {
      gw: 11,
      rankedCount: 11_261_396,
      builtAt: '2026-11-26T00:00:00Z',
      points: [
        { totalPoints: 855, rank: 1 },
        { totalPoints: 748, rank: 49_929 },
        { totalPoints: 605, rank: 4_399_904 },
      ],
    };

    Given('a bootstrap where GW11 is finished and checked while GW12 is next', () => {
      kv = makeKv({
        'fpl:/bootstrap-static/': JSON.stringify(settledBootstrap()),
        [rankCurveCacheKey(11)]: JSON.stringify(cachedCurve),
      });
    });

    And("the gameweek's curve is already cached", () => {
      fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;
    });

    When('I request the rank curve', async () => {
      const env: RankCurveEnv = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test/api' };
      const { ctx } = makeCtx();
      result = await handleRankCurve(env, ctx);
    });

    Then('the cached curve is returned', () => {
      expect(result.status).toBe(200);
      expect(result.cache).toBe('HIT');
      expect(result.body).toEqual(cachedCurve);
    });

    And('the global league was never sampled', () => {
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  Scenario(
    'Pages that fail are skipped rather than failing the build',
    ({ Given, And, When, Then }) => {
      let kv: FakeKv;
      let result: Awaited<ReturnType<typeof handleRankCurve>>;

      Given('a bootstrap where GW11 is finished and checked while GW12 is next', () => {
        kv = makeKv({ 'fpl:/bootstrap-static/': JSON.stringify(settledBootstrap()) });
      });

      And('the global league fails every third sampled page', () => {
        globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
          const page = Number(new URL(String(input)).searchParams.get('page_standings') ?? '1');
          const index = RANK_CURVE_SAMPLE_PAGES.indexOf(page);
          if (index >= 0 && index % 3 === 0) return new Response('nope', { status: 503 });
          return new Response(pageBody(page), { status: 200 });
        }) as unknown as typeof fetch;
      });

      When('I request the rank curve', async () => {
        const env: RankCurveEnv = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test/api' };
        const { ctx, waiters } = makeCtx();
        result = await handleRankCurve(env, ctx);
        await Promise.all(waiters);
      });

      Then('the curve is still built from the pages that answered', () => {
        expect(result.status).toBe(200);
        if ('error' in result.body) throw new Error('expected a curve');
        const answered = RANK_CURVE_SAMPLE_PAGES.filter((_page, i) => i % 3 !== 0).length;
        expect(result.body.points.length).toBeGreaterThan(8);
        expect(result.body.points.length).toBeLessThanOrEqual(answered);
      });
    }
  );

  Scenario('Before any gameweek settles there is no curve to serve', ({ Given, When, Then }) => {
    let kv: FakeKv;
    let result: Awaited<ReturnType<typeof handleRankCurve>>;

    Given('a bootstrap where the current gameweek is unfinished', () => {
      kv = makeKv({ 'fpl:/bootstrap-static/': JSON.stringify(unsettledBootstrap()) });
      globalThis.fetch = vi.fn() as unknown as typeof fetch;
    });

    When('I request the rank curve', async () => {
      const env: RankCurveEnv = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test/api' };
      const { ctx } = makeCtx();
      result = await handleRankCurve(env, ctx);
    });

    Then('the response reports that no gameweek has settled', () => {
      expect(result.status).toBe(404);
      expect(result.body).toEqual({ error: 'no settled gameweek yet' });
    });
  });
});
