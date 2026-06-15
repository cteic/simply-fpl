import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FplLiveGameweek } from '@simplyfpl/types';

import { LiveGwDO } from './live-gw-do';

interface FakeStorage {
  data: Map<string, unknown>;
  alarm: number | null;
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  getAlarm(): Promise<number | null>;
  setAlarm(when: number): Promise<void>;
}

function createFakeStorage(): FakeStorage {
  const storage: FakeStorage = {
    data: new Map(),
    alarm: null,
    async get<T>(key: string): Promise<T | undefined> {
      return storage.data.get(key) as T | undefined;
    },
    async put(key: string, value: unknown): Promise<void> {
      storage.data.set(key, value);
    },
    async delete(key: string): Promise<void> {
      storage.data.delete(key);
    },
    async getAlarm(): Promise<number | null> {
      return storage.alarm;
    },
    async setAlarm(when: number): Promise<void> {
      storage.alarm = when;
    },
  };
  return storage;
}

interface FakeSocket {
  sent: string[];
  send(payload: string): void;
}

function createFakeSocket(opts: { throwOnSend?: boolean } = {}): FakeSocket {
  return {
    sent: [],
    send(payload: string) {
      if (opts.throwOnSend) throw new Error('socket dead');
      this.sent.push(payload);
    },
  };
}

interface FakeKv {
  store: Map<string, string>;
  get(key: string, type: 'text'): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  putCalls: Array<{ key: string; value: string; ttl?: number }>;
}

function createFakeKv(initial: Record<string, string> = {}): FakeKv {
  const store = new Map<string, string>(Object.entries(initial));
  const putCalls: FakeKv['putCalls'] = [];
  return {
    store,
    putCalls,
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string, opts?: { expirationTtl?: number }) {
      store.set(key, value);
      const entry: { key: string; value: string; ttl?: number } = { key, value };
      if (opts?.expirationTtl !== undefined) entry.ttl = opts.expirationTtl;
      putCalls.push(entry);
    },
  };
}

function makeSnapshot(totalPoints: number): FplLiveGameweek {
  return {
    elements: [
      {
        id: 1,
        stats: {
          minutes: 90,
          goals_scored: 0,
          assists: 0,
          clean_sheets: 0,
          goals_conceded: 0,
          yellow_cards: 0,
          red_cards: 0,
          saves: 0,
          bonus: 0,
          bps: 0,
          total_points: totalPoints,
          clearances_blocks_interceptions: 0,
          tackles: 0,
        },
        explain: [],
      },
    ],
  };
}

const ORIGINAL_FETCH = globalThis.fetch;

describe('LiveGwDO.alarm', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it('broadcasts a delta and mirrors to KV when stats change', async () => {
    const storage = createFakeStorage();
    await storage.put('gw', 39);
    await storage.put('snapshot', makeSnapshot(2));

    const socketA = createFakeSocket();
    const socketB = createFakeSocket();
    const kv = createFakeKv({
      'fpl:/bootstrap-static/': JSON.stringify({
        events: [
          {
            id: 39,
            name: 'GW39',
            deadline_time: new Date(Date.now() - 60_000).toISOString(),
            is_current: true,
            is_next: false,
            is_previous: false,
            average_entry_score: 0,
            highest_score: null,
            finished: false,
          },
        ],
      }),
      'fpl:/fixtures/': JSON.stringify([
        {
          id: 1,
          event: 39,
          finished: false,
          kickoff_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          team_h: 1,
          team_a: 2,
          team_h_score: null,
          team_a_score: null,
          team_h_difficulty: 3,
          team_a_difficulty: 3,
        },
      ]),
    });

    const fakeState = {
      storage,
      getWebSockets: () => [socketA, socketB] as unknown as WebSocket[],
      acceptWebSocket: () => {},
    } as unknown as DurableObjectState;

    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(makeSnapshot(8)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const env = {
      FPL_BASE_URL: 'https://fpl.example/api',
      FPL_CACHE: kv as unknown as KVNamespace,
    };
    const doInstance = new LiveGwDO(fakeState, env);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await doInstance.alarm();

    expect(socketA.sent).toHaveLength(1);
    expect(socketB.sent).toHaveLength(1);
    const message = JSON.parse(socketA.sent[0] ?? '{}');
    expect(message.type).toBe('delta');
    expect(message.elements).toHaveLength(1);
    expect(message.elements[0].id).toBe(1);
    expect(message.elements[0].stats.total_points).toBe(8);

    const mirror = kv.putCalls.find((c) => c.key === 'live:gw:39');
    expect(mirror).toBeDefined();
    expect(mirror?.ttl).toBe(60);

    expect(storage.alarm).not.toBeNull();

    const summaryLines = warnSpy.mock.calls
      .map((args) => String(args[0]))
      .filter((line) => line.includes('event=alarm'));
    expect(summaryLines).toHaveLength(1);
    const summary = summaryLines[0] ?? '';
    expect(summary).toContain('gw=39');
    expect(summary).toContain('connected=2');
    expect(summary).toContain('broadcasted=2');
    expect(summary).toContain('kv_mirror=ok');
    expect(summary).toMatch(/next_alarm_ms=\d+/);
  });

  it('emits one alarm-summary log per alarm with broadcasted=0 when nothing changed', async () => {
    const storage = createFakeStorage();
    await storage.put('gw', 39);
    await storage.put('snapshot', makeSnapshot(5));

    const socket = createFakeSocket();
    const kv = createFakeKv();

    const fakeState = {
      storage,
      getWebSockets: () => [socket] as unknown as WebSocket[],
      acceptWebSocket: () => {},
    } as unknown as DurableObjectState;

    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(makeSnapshot(5)), { status: 200 })
    );

    const doInstance = new LiveGwDO(fakeState, {
      FPL_BASE_URL: 'https://fpl.example/api',
      FPL_CACHE: kv as unknown as KVNamespace,
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await doInstance.alarm();

    const summaryLines = warnSpy.mock.calls
      .map((args) => String(args[0]))
      .filter((line) => line.includes('event=alarm'));
    expect(summaryLines).toHaveLength(1);
    expect(summaryLines[0]).toContain('broadcasted=0');
    expect(summaryLines[0]).toContain('connected=1');
    expect(summaryLines[0]).toContain('kv_mirror=ok');
  });

  it('does not broadcast when stats are unchanged', async () => {
    const storage = createFakeStorage();
    await storage.put('gw', 39);
    await storage.put('snapshot', makeSnapshot(5));

    const socket = createFakeSocket();
    const kv = createFakeKv();

    const fakeState = {
      storage,
      getWebSockets: () => [socket] as unknown as WebSocket[],
      acceptWebSocket: () => {},
    } as unknown as DurableObjectState;

    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(makeSnapshot(5)), { status: 200 })
    );

    const doInstance = new LiveGwDO(fakeState, {
      FPL_BASE_URL: 'https://fpl.example/api',
      FPL_CACHE: kv as unknown as KVNamespace,
    });

    await doInstance.alarm();

    expect(socket.sent).toEqual([]);
    expect(kv.putCalls.find((c) => c.key.startsWith('live:gw:'))).toBeUndefined();
    expect(storage.alarm).not.toBeNull();
  });

  it('continues broadcasting when one socket throws', async () => {
    const storage = createFakeStorage();
    await storage.put('gw', 39);

    const dead = createFakeSocket({ throwOnSend: true });
    const alive = createFakeSocket();
    const kv = createFakeKv();

    const fakeState = {
      storage,
      getWebSockets: () => [dead, alive] as unknown as WebSocket[],
      acceptWebSocket: () => {},
    } as unknown as DurableObjectState;

    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(makeSnapshot(3)), { status: 200 })
    );

    const doInstance = new LiveGwDO(fakeState, {
      FPL_BASE_URL: 'https://fpl.example/api',
      FPL_CACHE: kv as unknown as KVNamespace,
    });

    await doInstance.alarm();

    expect(alive.sent).toHaveLength(1);
  });

  it('backs off exponentially on a 5xx response', async () => {
    const storage = createFakeStorage();
    await storage.put('gw', 39);

    const fakeState = {
      storage,
      getWebSockets: () => [],
      acceptWebSocket: () => {},
    } as unknown as DurableObjectState;

    vi.mocked(globalThis.fetch).mockResolvedValue(new Response('boom', { status: 503 }));

    const doInstance = new LiveGwDO(fakeState, {
      FPL_BASE_URL: 'https://fpl.example/api',
      FPL_CACHE: createFakeKv() as unknown as KVNamespace,
    });

    await doInstance.alarm();
    expect(await storage.get<number>('backoffMs')).toBe(1_000);
    await doInstance.alarm();
    expect(await storage.get<number>('backoffMs')).toBe(2_000);
    await doInstance.alarm();
    expect(await storage.get<number>('backoffMs')).toBe(4_000);
    await doInstance.alarm();
    expect(await storage.get<number>('backoffMs')).toBe(8_000);
    await doInstance.alarm();
    expect(await storage.get<number>('backoffMs')).toBe(8_000);
  });

  it('honours Retry-After header on 429', async () => {
    const storage = createFakeStorage();
    await storage.put('gw', 39);

    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response('rate-limited', { status: 429, headers: { 'Retry-After': '3' } })
    );

    const fakeState = {
      storage,
      getWebSockets: () => [],
      acceptWebSocket: () => {},
    } as unknown as DurableObjectState;

    const before = Date.now();
    const doInstance = new LiveGwDO(fakeState, {
      FPL_BASE_URL: 'https://fpl.example/api',
      FPL_CACHE: createFakeKv() as unknown as KVNamespace,
    });
    await doInstance.alarm();
    const alarm = storage.alarm;
    expect(alarm).not.toBeNull();
    expect(alarm).toBeGreaterThanOrEqual(before + 3_000);
  });

  it('sleeps when gameweek + bonus locked', async () => {
    const storage = createFakeStorage();
    await storage.put('gw', 39);
    await storage.put('snapshot', makeSnapshot(5));

    const kv = createFakeKv({
      'fpl:/bootstrap-static/': JSON.stringify({
        events: [
          {
            id: 39,
            name: 'GW39',
            deadline_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            is_current: true,
            is_next: false,
            is_previous: false,
            average_entry_score: 0,
            highest_score: null,
            finished: true,
          },
        ],
      }),
      'fpl:/fixtures/': JSON.stringify([
        {
          id: 1,
          event: 39,
          finished: true,
          kickoff_time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          team_h: 1,
          team_a: 2,
          team_h_score: 1,
          team_a_score: 0,
          team_h_difficulty: 3,
          team_a_difficulty: 3,
        },
      ]),
    });

    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(makeSnapshot(5)), { status: 200 })
    );

    const fakeState = {
      storage,
      getWebSockets: () => [],
      acceptWebSocket: () => {},
    } as unknown as DurableObjectState;

    const doInstance = new LiveGwDO(fakeState, {
      FPL_BASE_URL: 'https://fpl.example/api',
      FPL_CACHE: kv as unknown as KVNamespace,
    });
    storage.alarm = null;
    await doInstance.alarm();
    expect(storage.alarm).toBeNull();
    expect(await storage.get<boolean>('finished')).toBe(true);

    await doInstance.alarm();
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1);
  });
});
