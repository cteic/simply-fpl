import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  FplBootstrapStatic,
  FplEntry,
  FplEntryGameweekPicks,
  FplEntrySnapshot,
  FplPlayer,
} from '@simplyfpl/types';

import {
  type SnapshotEnv,
  buildBootstrapLite,
  currentGwFromBootstrap,
  handleEntrySnapshot,
} from './snapshot';

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

function makePlayer(id: number): FplPlayer {
  return {
    id,
    web_name: `Player${id}`,
    first_name: `FirstNameWithSomeLengthForRealism${id}`,
    second_name: `LastNameAlsoWithSomeLengthForRealism${id}`,
    team: (id % 20) + 1,
    element_type: ((id - 1) % 4) + 1,
    now_cost: 50 + (id % 50),
    total_points: id * 3,
    event_points: id % 12,
    selected_by_percent: ((id % 50) + 0.1).toFixed(1),
    transfers_in_event: id * 100,
    transfers_out_event: id * 50,
    chance_of_playing_next_round: 100,
    news: id % 10 === 0 ? `Long injury news string for player ${id} reported by some source` : '',
  };
}

function makeFatBootstrap(currentGwId = 30): FplBootstrapStatic {
  const base = makeBootstrap(currentGwId);
  base.elements = Array.from({ length: 830 }, (_, i) => makePlayer(i + 1));
  base.teams = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    name: `Some Team Name ${i + 1}`,
    short_name: `T${i + 1}`,
    code: 100 + i,
  }));
  base.element_types = Array.from({ length: 4 }, (_, i) => ({
    id: i + 1,
    plural_name: `Plurals${i + 1}`,
    plural_name_short: `PL${i + 1}`,
    singular_name: `Singular${i + 1}`,
    singular_name_short: `S${i + 1}`,
  }));
  return base;
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

function unwrapSnapshot(body: FplEntrySnapshot | { error: string }): FplEntrySnapshot {
  if ('error' in body) throw new Error(`expected snapshot, got error: ${body.error}`);
  return body;
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
    expect(body.picksAvailable).toBe(true);
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
    expect(body.picksAvailable).toBe(false);
  });

  it('returns 502 when bootstrap fetch fails (uncached + upstream down)', async () => {
    const kv = makeKv();
    fetchMock.mockResolvedValue(new Response('down', { status: 502 }));
    const env: SnapshotEnv = { FPL_CACHE: kv, FPL_BASE_URL: 'https://fpl.test/api' };

    const result = await handleEntrySnapshot(env, makeCtx(), 1);

    expect(result.status).toBe(502);
  });

  it('serves a lite bootstrap payload under 10KB even with a realistic 830-player league', async () => {
    const bootstrap = makeFatBootstrap(30);
    const entry = makeEntry(7);
    const pickIds = [11, 22, 33, 44, 55, 66, 77, 88, 99, 110, 121, 132, 143, 154, 165];
    const picks: FplEntryGameweekPicks = {
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
      picks: pickIds.map((id, i) => ({
        element: id,
        position: i + 1,
        multiplier: i === 0 ? 2 : 1,
        is_captain: i === 0,
        is_vice_captain: i === 1,
      })),
    };
    const fullSize = JSON.stringify(bootstrap).length;
    expect(fullSize).toBeGreaterThan(100_000);

    const kv = makeKv({
      'fpl:/bootstrap-static/': JSON.stringify(bootstrap),
      'fpl:/entry/7/': JSON.stringify(entry),
      'fpl:/entry/7/event/30/picks/': JSON.stringify(picks),
    });
    const env: SnapshotEnv = { FPL_CACHE: kv, FPL_BASE_URL: 'https://fpl.test/api' };

    const result = await handleEntrySnapshot(env, makeCtx(), 7);

    expect(result.status).toBe(200);
    const body = unwrapSnapshot(result.body);
    const payloadSize = JSON.stringify(body).length;
    expect(payloadSize).toBeLessThan(10_000);
    expect(body.bootstrap.elements.length).toBe(pickIds.length);
    expect(body.bootstrap.events.length).toBe(1);
    expect(body.bootstrap.events[0]?.id).toBe(30);
    expect(body.bootstrap.teams.length).toBe(20);
  });

  it('returns picks-element-only players when picks present (lite projection)', async () => {
    const bootstrap = makeFatBootstrap(30);
    const entry = makeEntry(8);
    const pickIds = [1, 2, 3];
    const picks: FplEntryGameweekPicks = {
      active_chip: null,
      automatic_subs: [],
      entry_history: {
        event: 30,
        points: 0,
        total_points: 0,
        rank: 0,
        rank_sort: 0,
        overall_rank: 0,
        event_transfers: 0,
        event_transfers_cost: 0,
        points_on_bench: 0,
      },
      picks: pickIds.map((id, i) => ({
        element: id,
        position: i + 1,
        multiplier: 1,
        is_captain: false,
        is_vice_captain: false,
      })),
    };
    const kv = makeKv({
      'fpl:/bootstrap-static/': JSON.stringify(bootstrap),
      'fpl:/entry/8/': JSON.stringify(entry),
      'fpl:/entry/8/event/30/picks/': JSON.stringify(picks),
    });
    const env: SnapshotEnv = { FPL_CACHE: kv, FPL_BASE_URL: 'https://fpl.test/api' };

    const result = await handleEntrySnapshot(env, makeCtx(), 8);

    expect(result.status).toBe(200);
    const body = unwrapSnapshot(result.body);
    const elementIds = body.bootstrap.elements.map((e) => e.id).sort((a, b) => a - b);
    expect(elementIds).toEqual(pickIds);
    expect(body.bootstrap.elements.every((e) => e.first_name === '')).toBe(true);
    expect(body.bootstrap.elements.every((e) => e.news === '')).toBe(true);
  });
});

describe('buildBootstrapLite', () => {
  it('keeps only the named-pick players and current event', () => {
    const bootstrap = makeFatBootstrap(30);
    const lite = buildBootstrapLite(bootstrap, 30, [5, 10, 15]);
    expect(lite.elements.map((e) => e.id).sort((a, b) => a - b)).toEqual([5, 10, 15]);
    expect(lite.events).toHaveLength(1);
    expect(lite.events[0]?.id).toBe(30);
    expect(lite.teams).toHaveLength(20);
  });

  it('returns empty elements when no pick ids supplied', () => {
    const bootstrap = makeFatBootstrap(30);
    const lite = buildBootstrapLite(bootstrap, 30, []);
    expect(lite.elements).toHaveLength(0);
  });
});
