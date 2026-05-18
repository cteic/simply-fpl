import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  FplBootstrapStatic,
  FplEntry,
  FplEntryGameweekPicks,
  FplEntrySnapshot,
} from '@simplyfpl/types';

import { type SnapshotEnv, currentGwFromBootstrap, handleEntrySnapshot } from './snapshot';

function makeBootstrap(currentGwId = 30): FplBootstrapStatic {
  return {
    elements: [],
    teams: [],
    events: [
      {
        id: currentGwId,
        name: `Gameweek ${currentGwId}`,
        deadline_time: '',
        is_current: true,
        is_next: false,
        is_previous: false,
        average_entry_score: 0,
        highest_score: null,
        finished: false,
      },
      {
        id: currentGwId + 1,
        name: `Gameweek ${currentGwId + 1}`,
        deadline_time: '',
        is_current: false,
        is_next: true,
        is_previous: false,
        average_entry_score: 0,
        highest_score: null,
        finished: false,
      },
    ],
    element_types: [],
  };
}

function makeEntry(id = 1): FplEntry {
  return {
    id,
    player_first_name: 'Sam',
    player_last_name: 'J',
    name: 'Test FC',
    summary_overall_rank: 38_859,
    summary_overall_points: 2243,
    summary_event_rank: null,
    summary_event_points: 0,
  };
}

function makePicks(): FplEntryGameweekPicks {
  return {
    active_chip: null,
    automatic_subs: [],
    entry_history: {
      event: 30,
      points: 0,
      total_points: 2243,
      rank: 0,
      rank_sort: 0,
      overall_rank: 38_859,
      event_transfers: 0,
      event_transfers_cost: 0,
      points_on_bench: 0,
    },
    picks: [],
  };
}

function makeKv(initial: Record<string, string> = {}): KVNamespace {
  const store = new Map(Object.entries(initial));
  return {
    get: vi.fn(async (key: string, type?: string) => {
      const value = store.get(key) ?? null;
      if (type === 'text' || type === undefined) return value;
      return value;
    }),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  } as unknown as KVNamespace;
}

function makeCtx(): ExecutionContext {
  return {
    waitUntil: (_p: Promise<unknown>) => undefined,
    passThroughOnException: () => undefined,
  } as unknown as ExecutionContext;
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('currentGwFromBootstrap', () => {
  it('returns the is_current event id', () => {
    expect(currentGwFromBootstrap(makeBootstrap(37))).toBe(37);
  });

  it('falls back to is_next when no current', () => {
    const b = makeBootstrap(30);
    const first = b.events[0];
    if (first) first.is_current = false;
    expect(currentGwFromBootstrap(b)).toBe(31);
  });
});

describe('handleEntrySnapshot', () => {
  it('returns bootstrap + entry + picks when all KV-cached (zero upstream fetches)', async () => {
    const bootstrap = makeBootstrap(30);
    const entry = makeEntry(1);
    const picks = makePicks();
    const kv = makeKv({
      'fpl:/bootstrap-static/': JSON.stringify(bootstrap),
      'fpl:/entry/1/': JSON.stringify(entry),
      'fpl:/entry/1/event/30/picks/': JSON.stringify(picks),
    });
    const env: SnapshotEnv = { FPL_CACHE: kv, FPL_BASE_URL: 'https://fpl.test/api' };

    const result = await handleEntrySnapshot(env, makeCtx(), 1);

    expect(result.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    const body = result.body as FplEntrySnapshot;
    expect(body.gw).toBe(30);
    expect(body.bootstrap.events[0]?.id).toBe(30);
    expect(body.entry.id).toBe(1);
    expect(body.picks).not.toBeNull();
  });

  it('returns 404 when the entry does not exist', async () => {
    const bootstrap = makeBootstrap(30);
    const kv = makeKv({ 'fpl:/bootstrap-static/': JSON.stringify(bootstrap) });
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/entry/999/')) {
        return new Response('not found', { status: 404 });
      }
      if (url.includes('/picks/')) {
        return new Response('not found', { status: 404 });
      }
      return new Response('unexpected', { status: 500 });
    });
    const env: SnapshotEnv = { FPL_CACHE: kv, FPL_BASE_URL: 'https://fpl.test/api' };

    const result = await handleEntrySnapshot(env, makeCtx(), 999);

    expect(result.status).toBe(404);
    expect((result.body as { error: string }).error).toBe('entry not found');
  });

  it('returns picks: null when entry exists but has no picks for the current gw', async () => {
    const bootstrap = makeBootstrap(30);
    const entry = makeEntry(2);
    const kv = makeKv({
      'fpl:/bootstrap-static/': JSON.stringify(bootstrap),
      'fpl:/entry/2/': JSON.stringify(entry),
    });
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/picks/')) {
        return new Response('not found', { status: 404 });
      }
      return new Response('unexpected', { status: 500 });
    });
    const env: SnapshotEnv = { FPL_CACHE: kv, FPL_BASE_URL: 'https://fpl.test/api' };

    const result = await handleEntrySnapshot(env, makeCtx(), 2);

    expect(result.status).toBe(200);
    const body = result.body as FplEntrySnapshot;
    expect(body.entry.id).toBe(2);
    expect(body.picks).toBeNull();
  });

  it('returns 502 when bootstrap fetch fails (uncached + upstream down)', async () => {
    const kv = makeKv();
    fetchMock.mockResolvedValue(new Response('down', { status: 502 }));
    const env: SnapshotEnv = { FPL_CACHE: kv, FPL_BASE_URL: 'https://fpl.test/api' };

    const result = await handleEntrySnapshot(env, makeCtx(), 1);

    expect(result.status).toBe(502);
  });
});
