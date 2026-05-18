import type { FplLiveGameweek } from '@simplyfpl/types';

export interface ReplayRow {
  ts: string;
  gw: number;
  data: FplLiveGameweek;
}

export interface ReplayEnv {
  FPL_CACHE: KVNamespace;
  RECORDINGS_R2?: R2Bucket;
}

export const REPLAY_KV_PREFIX = 'recording:';
export const DEFAULT_SPEED = 1;
export const MAX_SPEED = 600;

function isFplLiveGameweek(value: unknown): value is FplLiveGameweek {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { elements?: unknown };
  return Array.isArray(candidate.elements);
}

function isReplayRow(value: unknown): value is ReplayRow {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { ts?: unknown; gw?: unknown; data?: unknown };
  if (typeof candidate.ts !== 'string') return false;
  if (typeof candidate.gw !== 'number') return false;
  if (!isFplLiveGameweek(candidate.data)) return false;
  return !Number.isNaN(Date.parse(candidate.ts));
}

export function parseRecording(text: string): ReplayRow[] {
  const rows: ReplayRow[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (isReplayRow(parsed)) rows.push(parsed);
  }
  return rows;
}

export function parseSpeed(raw: string | null): number {
  if (raw === null) return DEFAULT_SPEED;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_SPEED;
  return Math.min(n, MAX_SPEED);
}

export interface NextEmitInput {
  rows: ReplayRow[];
  rowIndex: number;
  firstRowTsMs: number;
  replayStartMs: number;
  speed: number;
  nowMs: number;
}

export function computeNextEmitDelayMs(input: NextEmitInput): number | null {
  const { rows, rowIndex, firstRowTsMs, replayStartMs, speed, nowMs } = input;
  if (rowIndex >= rows.length) return null;
  const row = rows[rowIndex];
  if (!row) return null;
  const rowTsMs = Date.parse(row.ts);
  if (Number.isNaN(rowTsMs)) return null;
  const emitAtMs = replayStartMs + (rowTsMs - firstRowTsMs) / speed;
  return Math.max(0, emitAtMs - nowMs);
}

export async function loadRecordingText(
  env: ReplayEnv,
  recordingId: string
): Promise<string | null> {
  if (env.RECORDINGS_R2) {
    try {
      const obj = await env.RECORDINGS_R2.get(`${recordingId}/recording.jsonl`);
      if (obj) return await obj.text();
    } catch (err) {
      console.warn(`replay: R2 fetch failed for ${recordingId}: ${String(err)}`);
    }
  }
  return env.FPL_CACHE.get(`${REPLAY_KV_PREFIX}${recordingId}`, 'text');
}

const RECORDING_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/;

export function isValidRecordingId(id: string): boolean {
  return RECORDING_ID_PATTERN.test(id);
}
