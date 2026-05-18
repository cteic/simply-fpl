import type {
  FplBootstrapStatic,
  FplEvent,
  FplFixture,
  FplLiveElement,
  FplLiveGameweek,
} from '@simplyfpl/types';

import { isGameweekFinishedAndBonusLocked, pickCadenceMs } from './cadence';
import {
  type ReplayRow,
  computeNextEmitDelayMs,
  isValidRecordingId,
  loadRecordingText,
  parseRecording,
  parseSpeed,
} from './replay';
import { diffLiveSnapshots } from './snapshot-diff';

interface LiveGwEnv {
  FPL_BASE_URL: string;
  FPL_CACHE: KVNamespace;
  RECORDINGS_R2?: R2Bucket;
}

interface ReplayState {
  recordingId: string;
  speed: number;
  rowIndex: number;
  firstRowTsMs: number;
  replayStartMs: number;
}

interface DeltaMessage {
  type: 'delta';
  elements: FplLiveElement[];
  ts: number;
}

interface SnapshotMessage {
  type: 'snapshot';
  data: FplLiveGameweek;
  ts: number;
}

const STORAGE_KEY_SNAPSHOT = 'snapshot';
const STORAGE_KEY_GW = 'gw';
const STORAGE_KEY_BACKOFF = 'backoffMs';
const STORAGE_KEY_FINISHED = 'finished';
const STORAGE_KEY_REPLAY = 'replay';
const STORAGE_KEY_REPLAY_ROWS = 'replayRows';

const BACKOFF_INITIAL_MS = 1_000;
const BACKOFF_MAX_MS = 8_000;
const KV_MIRROR_TTL_S = 60;
const FIRST_ALARM_DELAY_MS = 100;

function isFplLiveGameweek(value: unknown): value is FplLiveGameweek {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { elements?: unknown };
  return Array.isArray(candidate.elements);
}

function parseRetryAfterMs(headerValue: string | null): number | null {
  if (!headerValue) return null;
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.floor(seconds * 1000);
  }
  const dateMs = Date.parse(headerValue);
  if (!Number.isNaN(dateMs)) {
    const delta = dateMs - Date.now();
    return delta > 0 ? delta : 0;
  }
  return null;
}

function isBootstrap(value: unknown): value is FplBootstrapStatic {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { events?: unknown };
  return Array.isArray(candidate.events);
}

function isFixturesArray(value: unknown): value is FplFixture[] {
  return Array.isArray(value);
}

async function readJsonFromKv<T>(
  cache: KVNamespace,
  key: string,
  guard: (v: unknown) => v is T
): Promise<T | null> {
  const raw = await cache.get(key, 'text');
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export class LiveGwDO {
  private state: DurableObjectState;
  private env: LiveGwEnv;

  constructor(state: DurableObjectState, env: LiveGwEnv) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const gw = url.searchParams.get('gw') ?? 'unknown';

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const origin = request.headers.get('Origin');
    const isAllowedOrigin =
      !origin ||
      origin === 'http://localhost:3000' ||
      /^https:\/\/[a-z0-9-]+\.simply-fpl\.pages\.dev$/.test(origin);
    if (!isAllowedOrigin) {
      return new Response('Origin not allowed', { status: 403 });
    }

    const MAX_CONNECTIONS = 5000;
    if (this.state.getWebSockets().length >= MAX_CONNECTIONS) {
      return new Response('At capacity', { status: 503 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.state.acceptWebSocket(server);
    const connected = this.state.getWebSockets().length;
    console.warn(`LiveGwDO[gw:${gw}]: ws accepted (connected=${connected})`);

    const replayId = url.searchParams.get('replay');
    if (replayId !== null) {
      await this.handleReplayConnect(server, gw, replayId, url.searchParams.get('speed'));
      return new Response(null, { status: 101, webSocket: client });
    }

    const gwNumber = Number(gw);
    if (Number.isFinite(gwNumber)) {
      await this.state.storage.put(STORAGE_KEY_GW, gwNumber);
    }

    const snapshot = await this.state.storage.get<FplLiveGameweek>(STORAGE_KEY_SNAPSHOT);
    if (snapshot) {
      const message: SnapshotMessage = {
        type: 'snapshot',
        data: snapshot,
        ts: Date.now(),
      };
      try {
        server.send(JSON.stringify(message));
      } catch (err) {
        console.warn(`LiveGwDO[gw:${gw}]: failed to send initial snapshot: ${String(err)}`);
      }
    }

    const existingAlarm = await this.state.storage.getAlarm();
    if (existingAlarm === null) {
      await this.state.storage.setAlarm(Date.now() + FIRST_ALARM_DELAY_MS);
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleReplayConnect(
    server: WebSocket,
    gw: string,
    rawRecordingId: string,
    rawSpeed: string | null
  ): Promise<void> {
    if (!isValidRecordingId(rawRecordingId)) {
      console.warn(`LiveGwDO[replay]: invalid recording id "${rawRecordingId}"`);
      try {
        server.send(JSON.stringify({ type: 'error', message: 'invalid recording id' }));
        server.close(1008, 'invalid recording id');
      } catch (err) {
        console.warn(`LiveGwDO[replay]: failed to close on bad id: ${String(err)}`);
      }
      return;
    }

    const speed = parseSpeed(rawSpeed);

    const existingState = await this.state.storage.get<ReplayState>(STORAGE_KEY_REPLAY);
    let rows = await this.state.storage.get<ReplayRow[]>(STORAGE_KEY_REPLAY_ROWS);

    if (
      !existingState ||
      existingState.recordingId !== rawRecordingId ||
      existingState.speed !== speed ||
      !rows
    ) {
      const text = await loadRecordingText(this.env, rawRecordingId);
      if (!text) {
        console.warn(`LiveGwDO[replay]: recording "${rawRecordingId}" not found`);
        try {
          server.send(JSON.stringify({ type: 'error', message: 'recording not found' }));
          server.close(1011, 'recording not found');
        } catch (err) {
          console.warn(`LiveGwDO[replay]: failed to close on missing recording: ${String(err)}`);
        }
        return;
      }
      const parsed = parseRecording(text);
      if (parsed.length === 0) {
        console.warn(`LiveGwDO[replay]: recording "${rawRecordingId}" had no usable rows`);
        try {
          server.send(JSON.stringify({ type: 'error', message: 'recording empty' }));
          server.close(1011, 'recording empty');
        } catch (err) {
          console.warn(`LiveGwDO[replay]: failed to close on empty: ${String(err)}`);
        }
        return;
      }
      rows = parsed;
      const firstRow = parsed[0];
      if (!firstRow) return;
      const state: ReplayState = {
        recordingId: rawRecordingId,
        speed,
        rowIndex: 0,
        firstRowTsMs: Date.parse(firstRow.ts),
        replayStartMs: Date.now(),
      };
      await this.state.storage.put(STORAGE_KEY_REPLAY, state);
      await this.state.storage.put(STORAGE_KEY_REPLAY_ROWS, rows);
      await this.state.storage.put(STORAGE_KEY_SNAPSHOT, firstRow.data);
      await this.state.storage.put(STORAGE_KEY_GW, firstRow.gw);

      const snapshotMsg: SnapshotMessage = {
        type: 'snapshot',
        data: firstRow.data,
        ts: Date.now(),
      };
      try {
        server.send(JSON.stringify(snapshotMsg));
      } catch (err) {
        console.warn(
          `LiveGwDO[replay:${rawRecordingId}]: failed to send initial snapshot: ${String(err)}`
        );
      }

      const nextDelay = computeNextEmitDelayMs({
        rows,
        rowIndex: 1,
        firstRowTsMs: state.firstRowTsMs,
        replayStartMs: state.replayStartMs,
        speed,
        nowMs: Date.now(),
      });
      if (nextDelay !== null) {
        await this.state.storage.setAlarm(Date.now() + nextDelay);
      }
      console.warn(
        `LiveGwDO[replay:${rawRecordingId}] gw:${gw}: started ${rows.length} rows @ ${speed}x`
      );
      return;
    }

    const snapshot = await this.state.storage.get<FplLiveGameweek>(STORAGE_KEY_SNAPSHOT);
    if (snapshot) {
      const snapshotMsg: SnapshotMessage = {
        type: 'snapshot',
        data: snapshot,
        ts: Date.now(),
      };
      try {
        server.send(JSON.stringify(snapshotMsg));
      } catch (err) {
        console.warn(
          `LiveGwDO[replay:${rawRecordingId}]: failed to send catch-up snapshot: ${String(err)}`
        );
      }
    }
  }

  async webSocketMessage(_ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const size = typeof message === 'string' ? message.length : message.byteLength;
    console.warn(`LiveGwDO: ws message (${size} bytes)`);
  }

  async webSocketClose(
    _ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean
  ): Promise<void> {
    const remaining = this.state.getWebSockets().length;
    console.warn(
      `LiveGwDO: ws close code=${code} clean=${wasClean} reason="${reason}" remaining=${remaining}`
    );
  }

  async alarm(): Promise<void> {
    const replay = await this.state.storage.get<ReplayState>(STORAGE_KEY_REPLAY);
    if (replay) {
      await this.replayAlarm(replay);
      return;
    }

    const gw = await this.state.storage.get<number>(STORAGE_KEY_GW);
    if (typeof gw !== 'number' || !Number.isFinite(gw)) {
      console.warn('LiveGwDO: alarm fired without stored gw — skipping');
      return;
    }

    const alreadyFinished = await this.state.storage.get<boolean>(STORAGE_KEY_FINISHED);
    if (alreadyFinished === true) {
      return;
    }

    const upstreamUrl = `${this.env.FPL_BASE_URL}/event/${gw}/live/`;
    let response: Response;
    try {
      response = await fetch(upstreamUrl, {
        headers: {
          'User-Agent': 'SimplyFPL-DO/1.0',
          Accept: 'application/json',
        },
      });
    } catch (err) {
      console.warn(`LiveGwDO[gw:${gw}]: upstream fetch threw: ${String(err)}`);
      await this.scheduleBackoff(null);
      return;
    }

    if (response.status === 429 || response.status >= 500) {
      const retryAfter = parseRetryAfterMs(response.headers.get('Retry-After'));
      console.warn(`LiveGwDO[gw:${gw}]: upstream ${response.status} — backing off`);
      await this.scheduleBackoff(retryAfter);
      return;
    }

    if (!response.ok) {
      console.warn(`LiveGwDO[gw:${gw}]: upstream ${response.status} — rescheduling normally`);
      await this.scheduleNextAlarm();
      return;
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (err) {
      console.warn(`LiveGwDO[gw:${gw}]: failed to parse JSON: ${String(err)}`);
      await this.scheduleNextAlarm();
      return;
    }

    if (!isFplLiveGameweek(payload)) {
      console.warn(`LiveGwDO[gw:${gw}]: payload failed shape check`);
      await this.scheduleNextAlarm();
      return;
    }

    await this.state.storage.delete(STORAGE_KEY_BACKOFF);

    const prev = await this.state.storage.get<FplLiveGameweek>(STORAGE_KEY_SNAPSHOT);
    const changed = diffLiveSnapshots(prev ?? null, payload);

    if (changed.length > 0) {
      await this.state.storage.put(STORAGE_KEY_SNAPSHOT, payload);

      const message: DeltaMessage = {
        type: 'delta',
        elements: changed,
        ts: Date.now(),
      };
      const encoded = JSON.stringify(message);
      const sockets = this.state.getWebSockets();
      for (const ws of sockets) {
        try {
          ws.send(encoded);
        } catch (err) {
          console.warn(`LiveGwDO[gw:${gw}]: ws.send failed: ${String(err)}`);
        }
      }

      try {
        await this.env.FPL_CACHE.put(`live:gw:${gw}`, JSON.stringify(payload), {
          expirationTtl: KV_MIRROR_TTL_S,
        });
      } catch (err) {
        console.warn(`LiveGwDO[gw:${gw}]: KV mirror failed: ${String(err)}`);
      }
    }

    const { events, fixtures } = await this.readBootstrapAndFixtures();

    if (isGameweekFinishedAndBonusLocked(events, fixtures)) {
      await this.state.storage.put(STORAGE_KEY_FINISHED, true);
      console.warn(`LiveGwDO[gw:${gw}]: gameweek finished + bonus locked — sleeping`);
      return;
    }

    const cadence = pickCadenceMs(new Date(), events, fixtures);
    if (cadence === null) {
      await this.state.storage.put(STORAGE_KEY_FINISHED, true);
      return;
    }

    await this.state.storage.setAlarm(Date.now() + cadence);
  }

  private async replayAlarm(replay: ReplayState): Promise<void> {
    const rows = await this.state.storage.get<ReplayRow[]>(STORAGE_KEY_REPLAY_ROWS);
    if (!rows || rows.length === 0) {
      console.warn(`LiveGwDO[replay:${replay.recordingId}]: rows missing — stopping`);
      return;
    }

    if (replay.rowIndex >= rows.length) {
      console.warn(`LiveGwDO[replay:${replay.recordingId}]: exhausted ${rows.length} rows`);
      return;
    }

    const row = rows[replay.rowIndex];
    if (!row) return;

    const prev = await this.state.storage.get<FplLiveGameweek>(STORAGE_KEY_SNAPSHOT);
    const changed = diffLiveSnapshots(prev ?? null, row.data);

    if (changed.length > 0) {
      await this.state.storage.put(STORAGE_KEY_SNAPSHOT, row.data);
      const message: DeltaMessage = {
        type: 'delta',
        elements: changed,
        ts: Date.now(),
      };
      const encoded = JSON.stringify(message);
      const sockets = this.state.getWebSockets();
      for (const ws of sockets) {
        try {
          ws.send(encoded);
        } catch (err) {
          console.warn(`LiveGwDO[replay:${replay.recordingId}]: ws.send failed: ${String(err)}`);
        }
      }
    }

    const nextIndex = replay.rowIndex + 1;
    const updated: ReplayState = { ...replay, rowIndex: nextIndex };
    await this.state.storage.put(STORAGE_KEY_REPLAY, updated);

    const nextDelay = computeNextEmitDelayMs({
      rows,
      rowIndex: nextIndex,
      firstRowTsMs: replay.firstRowTsMs,
      replayStartMs: replay.replayStartMs,
      speed: replay.speed,
      nowMs: Date.now(),
    });
    if (nextDelay !== null) {
      await this.state.storage.setAlarm(Date.now() + nextDelay);
    }
  }

  private async scheduleBackoff(retryAfterMs: number | null): Promise<void> {
    if (retryAfterMs !== null) {
      await this.state.storage.setAlarm(Date.now() + Math.max(retryAfterMs, BACKOFF_INITIAL_MS));
      return;
    }
    const previous = await this.state.storage.get<number>(STORAGE_KEY_BACKOFF);
    const next =
      typeof previous === 'number' && previous >= BACKOFF_INITIAL_MS
        ? Math.min(previous * 2, BACKOFF_MAX_MS)
        : BACKOFF_INITIAL_MS;
    await this.state.storage.put(STORAGE_KEY_BACKOFF, next);
    await this.state.storage.setAlarm(Date.now() + next);
  }

  private async scheduleNextAlarm(): Promise<void> {
    const { events, fixtures } = await this.readBootstrapAndFixtures();
    const cadence = pickCadenceMs(new Date(), events, fixtures);
    if (cadence === null) return;
    await this.state.storage.setAlarm(Date.now() + cadence);
  }

  private async readBootstrapAndFixtures(): Promise<{
    events: FplEvent[];
    fixtures: FplFixture[];
  }> {
    const bootstrap = await readJsonFromKv(
      this.env.FPL_CACHE,
      'fpl:/bootstrap-static/',
      isBootstrap
    );
    const fixtures =
      (await readJsonFromKv(this.env.FPL_CACHE, 'fpl:/fixtures/', isFixturesArray)) ?? [];
    return { events: bootstrap?.events ?? [], fixtures };
  }
}
