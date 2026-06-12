import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

import type { FplLiveElement, FplLiveGameweek } from '@simplyfpl/types';

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
  closed: boolean;
  send(payload: string): void;
  close(code?: number, reason?: string): void;
}

function createFakeSocket(): FakeSocket {
  return {
    sent: [],
    closed: false,
    send(payload: string) {
      this.sent.push(payload);
    },
    close() {
      this.closed = true;
    },
  };
}

interface FakeKv {
  store: Map<string, string>;
  get(key: string, type: 'text'): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

function createFakeKv(initial: Record<string, string> = {}): FakeKv {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    store,
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
  };
}

function makeLive(totalPoints: number): FplLiveGameweek {
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

function makeRecording(rows: Array<{ ts: string; points: number }>): string {
  return rows.map((r) => JSON.stringify({ ts: r.ts, gw: 36, data: makeLive(r.points) })).join('\n');
}

interface ScenarioContext {
  storage: FakeStorage;
  kv: FakeKv;
  socket: FakeSocket;
  doInstance: LiveGwDO;
  recordingId: string;
  speed: number;
  rowCount: number;
}

const ORIGINAL_FETCH = globalThis.fetch;

function buildDo(recordingText: string, recordingId: string): ScenarioContext {
  const storage = createFakeStorage();
  const kv = createFakeKv({ [`recording:${recordingId}`]: recordingText });
  const socket = createFakeSocket();
  const fakeState = {
    storage,
    getWebSockets: () => [socket as unknown as WebSocket],
    acceptWebSocket: () => {},
  } as unknown as DurableObjectState;
  const doInstance = new LiveGwDO(fakeState, {
    FPL_BASE_URL: 'https://fpl.example/api',
    FPL_CACHE: kv as unknown as KVNamespace,
  });
  return { storage, kv, socket, doInstance, recordingId, speed: 1, rowCount: 0 };
}

async function connect(ctx: ScenarioContext): Promise<void> {
  const url = `https://worker.example/live/ws?gw=36&replay=${ctx.recordingId}&speed=${ctx.speed}`;
  const request = new Request(url, {
    headers: { Upgrade: 'websocket' },
  });
  // Polyfill WebSocketPair so handleReplayConnect can take the upgrade path
  // without the real Cloudflare runtime. The final Response(status: 101) throws
  // under Node — that's fine, the replay setup has already finished.
  Object.defineProperty(globalThis, 'WebSocketPair', {
    configurable: true,
    value: function WebSocketPair(this: unknown) {
      const fake = ctx.socket as unknown as WebSocket;
      return { 0: fake, 1: fake };
    },
  });
  try {
    await ctx.doInstance.fetch(request);
  } catch (err) {
    if (err instanceof RangeError) return;
    throw err;
  }
}

const feature = await loadFeature('./replay-mode.feature');

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  let ctx: ScenarioContext;

  BeforeEachScenario(() => {
    globalThis.fetch = vi.fn(() => {
      throw new Error('fetch should not be called in replay mode');
    });
  });

  AfterEachScenario(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  Scenario('Replay mode does not call the FPL upstream', ({ Given, When, And, Then }) => {
    Given('a recording with two rows is stored in KV under id "gw36-test"', () => {
      const text = makeRecording([
        { ts: '2026-05-13T18:00:00.000Z', points: 2 },
        { ts: '2026-05-13T18:00:10.000Z', points: 5 },
      ]);
      ctx = buildDo(text, 'gw36-test');
      ctx.rowCount = 2;
    });

    When('a client connects with replay=gw36-test and speed=10', async () => {
      ctx.speed = 10;
      await connect(ctx);
    });

    And('the replay alarm fires for every recorded row', async () => {
      for (let i = 0; i < ctx.rowCount + 1; i++) {
        await ctx.doInstance.alarm();
      }
    });

    Then('the FPL upstream is never called', () => {
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  Scenario('Replay snapshot shape matches live mode', ({ Given, When, Then }) => {
    Given('a recording with two rows is stored in KV under id "gw36-test"', () => {
      const text = makeRecording([
        { ts: '2026-05-13T18:00:00.000Z', points: 2 },
        { ts: '2026-05-13T18:00:10.000Z', points: 5 },
      ]);
      ctx = buildDo(text, 'gw36-test');
    });

    When('a client connects with replay=gw36-test and speed=10', async () => {
      ctx.speed = 10;
      await connect(ctx);
    });

    Then('the client receives a snapshot message with the recorded elements', () => {
      expect(ctx.socket.sent).toHaveLength(1);
      const raw = ctx.socket.sent[0];
      if (raw === undefined) throw new Error('no snapshot sent');
      const parsed: unknown = JSON.parse(raw);
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !('type' in parsed) ||
        !('data' in parsed) ||
        !('ts' in parsed)
      ) {
        throw new Error('snapshot shape invalid');
      }
      const msg = parsed as {
        type: string;
        data: { elements?: FplLiveElement[] };
        ts: number;
      };
      expect(msg.type).toBe('snapshot');
      expect(msg.data.elements).toHaveLength(1);
      expect(msg.data.elements?.[0]?.id).toBe(1);
      expect(msg.data.elements?.[0]?.stats.total_points).toBe(2);
      expect(typeof msg.ts).toBe('number');
    });
  });

  Scenario('Speed multiplier compresses emit cadence', ({ Given, When, Then }) => {
    Given(
      'a recording whose rows are 10 seconds apart is stored in KV under id "gw36-test"',
      () => {
        const text = makeRecording([
          { ts: '2026-05-13T18:00:00.000Z', points: 2 },
          { ts: '2026-05-13T18:00:10.000Z', points: 5 },
        ]);
        ctx = buildDo(text, 'gw36-test');
      }
    );

    When('a client connects with replay=gw36-test and speed=10', async () => {
      ctx.speed = 10;
      await connect(ctx);
    });

    Then('the next alarm is scheduled roughly one second in the future', () => {
      const alarm = ctx.storage.alarm;
      if (alarm === null) throw new Error('no alarm scheduled');
      const delay = alarm - Date.now();
      expect(delay).toBeGreaterThan(900);
      expect(delay).toBeLessThan(1_100);
    });
  });
});
