import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

import type {
  EntryNewsResponse,
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplEvent,
  FplPlayer,
  TeamNewsResponse,
} from '@simplyfpl/types';

import {
  NEWS_TEAMS_CACHE_KEY,
  NEWS_TEAMS_TTL_SECONDS,
  type NewsEnv,
  handleEntryNews,
  handleNewsTeams,
  warmNewsCache,
} from './index';

const feature = await loadFeature('./news.feature');

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
    waitUntil: vi.fn((p: Promise<unknown>) => {
      waiters.push(p);
    }),
  } as unknown as ExecutionContext;
  return { ctx, waiters };
}

function makeEvent(overrides: Partial<FplEvent> = {}): FplEvent {
  return {
    id: 1,
    name: 'Gameweek 1',
    deadline_time: '2026-08-15T11:00:00Z',
    is_current: true,
    is_next: false,
    is_previous: false,
    average_entry_score: 50,
    highest_score: null,
    finished: false,
    ...overrides,
  };
}

function makePlayer(overrides: Partial<FplPlayer> = {}): FplPlayer {
  return {
    id: 1,
    web_name: 'Saka',
    first_name: 'Bukayo',
    second_name: 'Saka',
    team: 1,
    element_type: 3,
    now_cost: 90,
    total_points: 0,
    event_points: 0,
    selected_by_percent: '30.0',
    transfers_in_event: 0,
    transfers_out_event: 0,
    chance_of_playing_next_round: 75,
    news: 'Knock',
    ...overrides,
  };
}

function makeBootstrap(
  players: FplPlayer[],
  events: FplEvent[] = [makeEvent()]
): FplBootstrapStatic {
  return {
    elements: players,
    teams: [
      { id: 1, name: 'Arsenal', short_name: 'ARS', code: 3 },
      { id: 2, name: 'Chelsea', short_name: 'CHE', code: 8 },
    ],
    events,
    element_types: [],
  };
}

function makePicks(elementIds: number[]): FplEntryGameweekPicks {
  return {
    active_chip: null,
    automatic_subs: [],
    entry_history: {
      event: 1,
      points: 60,
      total_points: 60,
      rank: 100_000,
      rank_sort: 100_000,
      overall_rank: 100_000,
      event_transfers: 0,
      event_transfers_cost: 0,
      points_on_bench: 5,
    },
    picks: elementIds.map((id, i) => ({
      element: id,
      position: i + 1,
      multiplier: 1,
      is_captain: i === 0,
      is_vice_captain: i === 1,
    })),
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Team news cache hit skips recomputation', ({ Given, When, Then, And }) => {
    let kv: FakeKv;
    let env: NewsEnv;
    let fetchMock: ReturnType<typeof vi.fn>;
    let result: Awaited<ReturnType<typeof handleNewsTeams>>;

    Given('the news:teams key is warm in KV', () => {
      const cached: TeamNewsResponse = {
        generated_at: '2026-01-01T00:00:00Z',
        teams: [],
      };
      kv = makeKv({ [NEWS_TEAMS_CACHE_KEY]: JSON.stringify(cached) });
      fetchMock = vi.fn();
      global.fetch = fetchMock;
      env = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test' };
    });

    When('handleNewsTeams is called', async () => {
      const { ctx } = makeCtx();
      result = await handleNewsTeams(env, ctx);
    });

    Then('the cached payload is returned', () => {
      expect(result.status).toBe(200);
      expect(result.cache).toBe('HIT');
    });

    And('the upstream FPL API is not called', () => {
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  Scenario('Team news cache miss computes from cached bootstrap', ({ Given, When, Then, And }) => {
    let kv: FakeKv;
    let env: NewsEnv;
    let result: Awaited<ReturnType<typeof handleNewsTeams>>;
    let ctx: ExecutionContext;
    let waiters: Promise<unknown>[];

    Given('no news:teams cache but bootstrap-static is cached with a doubtful player', () => {
      const bootstrap = makeBootstrap([makePlayer()]);
      kv = makeKv({ 'fpl:/bootstrap-static/': JSON.stringify(bootstrap) });
      env = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test' };
      global.fetch = vi.fn();
    });

    When('handleNewsTeams is called', async () => {
      const fake = makeCtx();
      ctx = fake.ctx;
      waiters = fake.waiters;
      result = await handleNewsTeams(env, ctx);
      await Promise.all(waiters);
    });

    Then('the collated payload is computed from the cached bootstrap', () => {
      expect(result.status).toBe(200);
      expect(result.cache).toBe('MISS');
      const body = result.body as TeamNewsResponse;
      expect(body.teams.length).toBeGreaterThan(0);
    });

    And('the result is written to KV with the 30-minute TTL', () => {
      expect(kv.ttls.get(NEWS_TEAMS_CACHE_KEY)).toBe(NEWS_TEAMS_TTL_SECONDS);
    });
  });

  Scenario(
    'Team news falls back to upstream when bootstrap not cached',
    ({ Given, When, Then, And }) => {
      let kv: FakeKv;
      let env: NewsEnv;
      let result: Awaited<ReturnType<typeof handleNewsTeams>>;

      Given('neither news:teams nor bootstrap-static is cached', () => {
        kv = makeKv();
        const bootstrap = makeBootstrap([makePlayer()]);
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: async () => JSON.stringify(bootstrap),
        });
        env = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test' };
      });

      When('handleNewsTeams is called', async () => {
        const { ctx } = makeCtx();
        result = await handleNewsTeams(env, ctx);
      });

      Then('the worker fetches bootstrap-static from upstream', () => {
        expect(global.fetch).toHaveBeenCalledWith(
          'https://fpl.test/bootstrap-static/',
          expect.any(Object)
        );
      });

      And('returns a collated payload', () => {
        expect(result.status).toBe(200);
      });
    }
  );

  Scenario('Entry news returns only squad players with news', ({ Given, When, Then, And }) => {
    let kv: FakeKv;
    let env: NewsEnv;
    let result: Awaited<ReturnType<typeof handleEntryNews>>;

    Given('bootstrap is cached with two doubtful players on different clubs', () => {
      const bootstrap = makeBootstrap([
        makePlayer({ id: 10, team: 1, news: 'Knock', chance_of_playing_next_round: 75 }),
        makePlayer({ id: 20, team: 2, news: 'Suspended', status: 's' }),
      ]);
      const picks = makePicks([10]);
      kv = makeKv({
        'fpl:/bootstrap-static/': JSON.stringify(bootstrap),
        'fpl:/entry/123/event/1/picks/': JSON.stringify(picks),
      });
      env = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test' };
      global.fetch = vi.fn();
    });

    And('entry picks contain only one of those players', () => {
      // picks set up in Given
    });

    When('handleEntryNews is called for that entry', async () => {
      const { ctx } = makeCtx();
      result = await handleEntryNews(env, ctx, 123);
    });

    Then('only the player in the squad is returned', () => {
      expect(result.status).toBe(200);
      const body = result.body as EntryNewsResponse;
      expect(body.players).toHaveLength(1);
      expect(body.players[0]?.id).toBe(10);
    });
  });

  Scenario('Entry news returns empty list when no current event', ({ Given, When, Then }) => {
    let kv: FakeKv;
    let env: NewsEnv;
    let result: Awaited<ReturnType<typeof handleEntryNews>>;

    Given('bootstrap is cached but has no current event', () => {
      const bootstrap = makeBootstrap(
        [makePlayer()],
        [makeEvent({ is_current: false, is_next: true })]
      );
      kv = makeKv({ 'fpl:/bootstrap-static/': JSON.stringify(bootstrap) });
      env = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test' };
      global.fetch = vi.fn();
    });

    When('handleEntryNews is called', async () => {
      const { ctx } = makeCtx();
      result = await handleEntryNews(env, ctx, 999);
    });

    Then('an empty players list is returned with status 200', () => {
      expect(result.status).toBe(200);
      const body = result.body as EntryNewsResponse;
      expect(body.players).toHaveLength(0);
    });
  });

  Scenario('warmNewsCache writes collated news to KV', ({ Given, When, Then }) => {
    let kv: FakeKv;
    let env: NewsEnv;

    Given('bootstrap-static is cached with one doubtful player', () => {
      const bootstrap = makeBootstrap([makePlayer()]);
      kv = makeKv({ 'fpl:/bootstrap-static/': JSON.stringify(bootstrap) });
      env = { FPL_CACHE: kv.namespace, FPL_BASE_URL: 'https://fpl.test' };
    });

    When('warmNewsCache is called', async () => {
      await warmNewsCache(env);
    });

    Then('the news:teams key is written to KV with the 30-minute TTL', () => {
      expect(kv.store.has(NEWS_TEAMS_CACHE_KEY)).toBe(true);
      expect(kv.ttls.get(NEWS_TEAMS_CACHE_KEY)).toBe(NEWS_TEAMS_TTL_SECONDS);
    });
  });
});
