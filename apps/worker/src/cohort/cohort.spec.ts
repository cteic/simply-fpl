import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

import type {
  FplEntryGameweekPicks,
  FplEntryPick,
  FplLeague,
  FplLeagueStanding,
} from '@simplyfpl/types';

import type { CohortSnapshotPayload, CohortTier } from './aggregate';
import { type CohortEnv, runScheduled } from './cohort';
import { TIER_CONFIGS } from './fetch-tier';

const feature = await loadFeature('./cohort.feature');

const GW = 38;
const SCHEDULED_TIME = Date.parse('2026-05-24T12:00:00Z');
const ENTRIES_PER_PAGE = 50;
const SUBREQUEST_CEILING = 1000;

interface FakeKv {
  namespace: KVNamespace;
  store: Map<string, string>;
}

function makeKv(initial: Record<string, string> = {}): FakeKv {
  const store = new Map(Object.entries(initial));
  const namespace = {
    get: vi.fn(async (key: string, type?: string) => {
      const raw = store.get(key);
      if (raw === undefined) return null;
      return type === 'json' ? JSON.parse(raw) : raw;
    }),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  } as unknown as KVNamespace;
  return { namespace, store };
}

function makeLockNamespace(): DurableObjectNamespace {
  const locks = new Map<string, number>();
  return {
    idFromName: vi.fn((name: string) => ({ name })),
    get: vi.fn((id: { name: string }) => ({
      fetch: vi.fn(async (input: string) => {
        const url = new URL(input);
        if (url.pathname === '/acquire') {
          const ttlSeconds = Number(url.searchParams.get('ttl') ?? '300');
          const expiresAt = locks.get(id.name);
          if (expiresAt !== undefined && expiresAt > Date.now()) {
            return new Response('held', { status: 409 });
          }
          locks.set(id.name, Date.now() + ttlSeconds * 1000);
          return new Response('acquired', { status: 200 });
        }
        if (url.pathname === '/release') {
          locks.delete(id.name);
          return new Response('released', { status: 200 });
        }
        return new Response('not found', { status: 404 });
      }),
    })),
  } as unknown as DurableObjectNamespace;
}

function makeCtx(): ExecutionContext {
  return {
    waitUntil(): void {
      /* noop */
    },
    passThroughOnException(): void {
      /* noop */
    },
  } as unknown as ExecutionContext;
}

function bootstrapJson(): string {
  const deadline = new Date(SCHEDULED_TIME - 60 * 60 * 1000).toISOString();
  return JSON.stringify({
    events: [{ id: GW, is_current: true, finished: false, deadline_time: deadline }],
  });
}

function standingsResults(page: number): FplLeagueStanding[] {
  const results: FplLeagueStanding[] = [];
  for (let i = 1; i <= ENTRIES_PER_PAGE; i += 1) {
    const entry = (page - 1) * ENTRIES_PER_PAGE + i;
    results.push({
      id: entry,
      entry,
      entry_name: `Team ${entry}`,
      player_name: `Manager ${entry}`,
      rank: entry,
      last_rank: entry,
      rank_sort: entry,
      total: 0,
      event_total: 0,
    });
  }
  return results;
}

function makeStandings(page: number): FplLeague {
  return {
    league: {
      id: 314,
      name: 'Overall',
      created: '',
      admin_entry: null,
      start_event: 1,
      league_type: 'c',
    },
    standings: { has_next: true, page, results: standingsResults(page) },
  };
}

function makePicks(): FplEntryGameweekPicks {
  const picks: FplEntryPick[] = [];
  for (let position = 1; position <= 15; position += 1) {
    picks.push({
      element: position,
      position,
      multiplier: position === 1 ? 2 : 1,
      is_captain: position === 1,
      is_vice_captain: position === 2,
    });
  }
  return {
    active_chip: null,
    automatic_subs: [],
    entry_history: {
      event: GW,
      points: 60,
      total_points: 0,
      rank: 0,
      rank_sort: 0,
      overall_rank: 0,
      event_transfers: 0,
      event_transfers_cost: 0,
      points_on_bench: 0,
    },
    picks,
  };
}

interface SnapshotPost {
  gw: number;
  cohort_tier: CohortTier;
  entries_sampled: number;
  is_complete: boolean;
  payload: CohortSnapshotPayload;
}

interface MockResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

interface FetchInit {
  method?: string;
  body?: string;
}

function okResponse(body: unknown): MockResponse {
  return { ok: true, status: 200, json: async () => body };
}

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_SET_TIMEOUT = globalThis.setTimeout;

let snapshotPosts: SnapshotPost[];

function installMocks(): CohortEnv {
  snapshotPosts = [];
  const { namespace } = makeKv({ 'fpl:/bootstrap-static/': bootstrapJson() });

  const fetchMock = vi.fn(async (input: string, init?: FetchInit) => {
    const url = typeof input === 'string' ? input : String(input);

    const standingsMatch = url.match(/\/leagues-classic\/314\/standings\/\?page_standings=(\d+)/);
    if (standingsMatch && standingsMatch[1]) {
      return okResponse(makeStandings(Number(standingsMatch[1])));
    }
    if (/\/entry\/\d+\/event\/\d+\/picks\//.test(url)) {
      return okResponse(makePicks());
    }
    if (url.includes('/rest/v1/cohort_snapshots')) {
      if (typeof init?.body === 'string') snapshotPosts.push(JSON.parse(init.body));
      return okResponse({});
    }
    if (url.includes('/rest/v1/cohort_player_stats')) {
      return okResponse({});
    }
    return { ok: false, status: 404, json: async () => ({}) };
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;

  return {
    FPL_CACHE: namespace,
    COHORT_LOCK: makeLockNamespace(),
    SUPABASE_URL: 'https://supabase.test',
    SUPABASE_SERVICE_ROLE: 'service-role-key',
  };
}

function readKvSnapshot(env: CohortEnv, tier: CohortTier): Promise<CohortSnapshotPayload | null> {
  return env.FPL_CACHE.get(`cohort:snapshot:${GW}:${tier}`, 'text').then((raw) =>
    raw === null ? null : JSON.parse(raw)
  );
}

function ticksToComplete(pagesToFetch: number, budgetPerTick: number): number {
  const totalRequests = pagesToFetch + pagesToFetch * ENTRIES_PER_PAGE;
  return Math.ceil(totalRequests / budgetPerTick);
}

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  BeforeEachScenario(() => {
    globalThis.setTimeout = ((callback: () => void) => {
      callback();
      return 0;
    }) as unknown as typeof setTimeout;
  });

  AfterEachScenario(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    globalThis.setTimeout = ORIGINAL_SET_TIMEOUT;
  });

  Scenario(
    'top_10k samples a representative slice that completes within a gameweek',
    ({ Given, Then, And }) => {
      Given('the configured cohort tiers', () => {
        expect(TIER_CONFIGS.top_10k).toBeDefined();
      });
      Then('top_10k fetches a representative sample between 1000 and 2500 entries', () => {
        const sample = TIER_CONFIGS.top_10k.pagesToFetch * ENTRIES_PER_PAGE;
        expect(sample).toBeGreaterThanOrEqual(1000);
        expect(sample).toBeLessThanOrEqual(2500);
      });
      And('top_10k completes in at most 12 ticks', () => {
        const ticks = ticksToComplete(
          TIER_CONFIGS.top_10k.pagesToFetch,
          TIER_CONFIGS.top_10k.budgetPerTick
        );
        expect(ticks).toBeLessThanOrEqual(12);
      });
      And('the live and idle tier budgets stay within the Worker subrequest ceiling', () => {
        const live = TIER_CONFIGS.legendary.budgetPerTick + TIER_CONFIGS.top_10k.budgetPerTick;
        const idle = live + TIER_CONFIGS.top_100k.budgetPerTick;
        expect(live).toBeLessThan(SUBREQUEST_CEILING);
        expect(idle).toBeLessThan(SUBREQUEST_CEILING);
      });
      And('the legendary tier budget is unchanged', () => {
        expect(TIER_CONFIGS.legendary.pagesToFetch).toBe(20);
        expect(TIER_CONFIGS.legendary.budgetPerTick).toBe(30);
      });
    }
  );

  Scenario(
    'each tick flushes a partial snapshot so the toggle shows the sample as it builds',
    ({ Given, When, Then, And }) => {
      let env: CohortEnv;

      Given('a live gameweek with the FPL standings and picks endpoints mocked', () => {
        env = installMocks();
      });
      When('the cohort cron runs once', async () => {
        await runScheduled(SCHEDULED_TIME, env, makeCtx());
      });
      Then('a partial top_10k snapshot is flushed with is_complete false', () => {
        const partial = snapshotPosts.filter((p) => p.cohort_tier === 'top_10k');
        expect(partial.length).toBeGreaterThan(0);
        const last = partial[partial.length - 1];
        expect(last?.is_complete).toBe(false);
        expect(last?.entries_sampled ?? 0).toBeGreaterThan(0);
      });
      And('the served top_10k snapshot in KV has a non-zero sample', async () => {
        const payload = await readKvSnapshot(env, 'top_10k');
        expect(payload).not.toBeNull();
        expect(payload?.entries_sampled ?? 0).toBeGreaterThan(0);
      });
    }
  );

  Scenario(
    'the sample is marked complete once the full pass finishes',
    ({ Given, When, Then, And }) => {
      let env: CohortEnv;
      let ticksRun = 0;

      Given('a live gameweek with the FPL standings and picks endpoints mocked', () => {
        env = installMocks();
      });
      When('the cohort cron runs until top_10k completes', async () => {
        const maxTicks = 20;
        ticksRun = 0;
        while (ticksRun < maxTicks) {
          ticksRun += 1;
          await runScheduled(SCHEDULED_TIME, env, makeCtx());
          if (snapshotPosts.some((p) => p.cohort_tier === 'top_10k' && p.is_complete)) break;
        }
      });
      Then("top_10k completed within a gameweek's worth of ticks", () => {
        expect(ticksRun).toBeLessThanOrEqual(12);
      });
      And('the final top_10k snapshot is flushed with is_complete true and a full sample', () => {
        const complete = snapshotPosts.find((p) => p.cohort_tier === 'top_10k' && p.is_complete);
        expect(complete).toBeDefined();
        const expectedSample = TIER_CONFIGS.top_10k.pagesToFetch * ENTRIES_PER_PAGE;
        expect(complete?.entries_sampled).toBe(expectedSample);
      });
      And('partial top_10k snapshots were flushed before completion', () => {
        const partialBeforeComplete = snapshotPosts.filter(
          (p) => p.cohort_tier === 'top_10k' && !p.is_complete
        );
        expect(partialBeforeComplete.length).toBeGreaterThan(0);
      });
    }
  );
});
