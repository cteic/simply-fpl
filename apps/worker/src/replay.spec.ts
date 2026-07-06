import { describe, expect, it } from 'vitest';

import type { FplLiveGameweek } from '@simplyfpl/types';

import {
  type ReplayEnv,
  type ReplayRow,
  computeNextEmitDelayMs,
  isValidRecordingId,
  loadRecordingText,
  parseRecording,
  parseSpeed,
} from './replay';

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

function makeRow(tsIso: string, totalPoints: number): ReplayRow {
  return { ts: tsIso, gw: 36, data: makeLive(totalPoints) };
}

interface FakeKv {
  store: Map<string, string>;
  get(key: string, type: 'text'): Promise<string | null>;
}

function createFakeKv(initial: Record<string, string> = {}): FakeKv {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    store,
    async get(key: string) {
      return store.get(key) ?? null;
    },
  };
}

describe('parseRecording', () => {
  it('parses jsonl rows with valid shape', () => {
    const r1 = makeRow('2026-05-13T18:04:59.106Z', 2);
    const r2 = makeRow('2026-05-13T18:05:09.106Z', 4);
    const text = `${JSON.stringify(r1)}\n${JSON.stringify(r2)}\n`;
    const rows = parseRecording(text);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.data.elements[0]?.stats.total_points).toBe(2);
    expect(rows[1]?.data.elements[0]?.stats.total_points).toBe(4);
  });

  it('skips blank lines and malformed json', () => {
    const r1 = makeRow('2026-05-13T18:04:59.106Z', 1);
    const text = `${JSON.stringify(r1)}\n\nnot json\n{"partial":true}\n`;
    const rows = parseRecording(text);
    expect(rows).toHaveLength(1);
  });

  it('skips rows without a usable data.elements payload (metadata-only)', () => {
    const metadataOnly = { ts: '2026-05-13T18:04:59.106Z', gw: 36, bodyHash: 'abc' };
    const rows = parseRecording(`${JSON.stringify(metadataOnly)}\n`);
    expect(rows).toEqual([]);
  });
});

describe('parseSpeed', () => {
  it('returns default when missing or invalid', () => {
    expect(parseSpeed(null)).toBe(1);
    expect(parseSpeed('not-a-number')).toBe(1);
    expect(parseSpeed('0')).toBe(1);
    expect(parseSpeed('-5')).toBe(1);
  });

  it('returns numeric speed when valid', () => {
    expect(parseSpeed('10')).toBe(10);
    expect(parseSpeed('2.5')).toBe(2.5);
  });

  it('clamps to a sensible max', () => {
    expect(parseSpeed('100000')).toBeLessThanOrEqual(600);
  });
});

describe('computeNextEmitDelayMs', () => {
  const rows = [
    makeRow('2026-05-13T18:00:00.000Z', 1),
    makeRow('2026-05-13T18:00:10.000Z', 2),
    makeRow('2026-05-13T18:00:30.000Z', 3),
  ];
  const firstRow = rows[0];
  if (!firstRow) throw new Error('test setup: no rows');
  const firstRowTsMs = Date.parse(firstRow.ts);
  const replayStartMs = 1_000_000;

  it('returns row gap divided by speed for 1x', () => {
    const delay = computeNextEmitDelayMs({
      rows,
      rowIndex: 1,
      firstRowTsMs,
      replayStartMs,
      speed: 1,
      nowMs: replayStartMs,
    });
    expect(delay).toBe(10_000);
  });

  it('compresses the gap by the speed multiplier', () => {
    const delay = computeNextEmitDelayMs({
      rows,
      rowIndex: 1,
      firstRowTsMs,
      replayStartMs,
      speed: 10,
      nowMs: replayStartMs,
    });
    expect(delay).toBe(1_000);
  });

  it('returns null past the end of the recording', () => {
    const delay = computeNextEmitDelayMs({
      rows,
      rowIndex: rows.length,
      firstRowTsMs,
      replayStartMs,
      speed: 1,
      nowMs: replayStartMs,
    });
    expect(delay).toBeNull();
  });

  it('clamps to zero when the wall clock has already passed the emit time', () => {
    const delay = computeNextEmitDelayMs({
      rows,
      rowIndex: 1,
      firstRowTsMs,
      replayStartMs,
      speed: 1,
      nowMs: replayStartMs + 60_000,
    });
    expect(delay).toBe(0);
  });
});

describe('loadRecordingText', () => {
  it('returns KV text when no R2 binding is present', async () => {
    const kv = createFakeKv({ 'recording:gw36': 'jsonl-text' });
    const env: ReplayEnv = { FPL_CACHE: kv as unknown as KVNamespace };
    const text = await loadRecordingText(env, 'gw36');
    expect(text).toBe('jsonl-text');
  });

  it('prefers R2 when present and returns its body', async () => {
    const kv = createFakeKv({ 'recording:gw36': 'from-kv' });
    const r2: R2Bucket = {
      get: async () => ({
        text: async () => 'from-r2',
      }),
    } as unknown as R2Bucket;
    const env: ReplayEnv = { FPL_CACHE: kv as unknown as KVNamespace, RECORDINGS_R2: r2 };
    const text = await loadRecordingText(env, 'gw36');
    expect(text).toBe('from-r2');
  });

  it('falls back to KV when R2 returns null', async () => {
    const kv = createFakeKv({ 'recording:gw36': 'from-kv' });
    const r2: R2Bucket = {
      get: async () => null,
    } as unknown as R2Bucket;
    const env: ReplayEnv = { FPL_CACHE: kv as unknown as KVNamespace, RECORDINGS_R2: r2 };
    const text = await loadRecordingText(env, 'gw36');
    expect(text).toBe('from-kv');
  });
});

describe('isValidRecordingId', () => {
  it('accepts simple ids', () => {
    expect(isValidRecordingId('gw36')).toBe(true);
    expect(isValidRecordingId('gw36-2026-05-13')).toBe(true);
    expect(isValidRecordingId('gw36.test_1')).toBe(true);
  });

  it('rejects ids with path traversal or unsafe chars', () => {
    expect(isValidRecordingId('../etc/passwd')).toBe(false);
    expect(isValidRecordingId('gw36/sub')).toBe(false);
    expect(isValidRecordingId('GW36')).toBe(false);
    expect(isValidRecordingId('')).toBe(false);
  });
});
