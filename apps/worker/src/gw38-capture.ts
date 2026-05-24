import type { FplLiveGameweek } from '@simplyfpl/types';

export const GW38_CAPTURE_GW = 38;
export const GW38_RECORDING_KEY = 'recordings/gw38/recording.jsonl';
export const GW38_WINDOW_START_MS = Date.parse('2026-05-24T14:00:00.000Z');
export const GW38_WINDOW_END_MS = Date.parse('2026-05-24T18:00:00.000Z');
export const GW38_CAPTURE_CRON = '*/10 14-18 * * 1';

export interface CaptureRow {
  ts: string;
  gw: number;
  data: FplLiveGameweek;
}

export interface CaptureBucket {
  get(key: string): Promise<{ text(): Promise<string> } | null>;
  put(key: string, value: string): Promise<unknown>;
}

export function isWithinGw38CaptureWindow(nowMs: number): boolean {
  return nowMs >= GW38_WINDOW_START_MS && nowMs <= GW38_WINDOW_END_MS;
}

export function shouldCaptureGw38(gw: number, nowMs: number): boolean {
  return gw === GW38_CAPTURE_GW && isWithinGw38CaptureWindow(nowMs);
}

export function buildCaptureRow(gw: number, data: FplLiveGameweek, nowMs: number): CaptureRow {
  return { ts: new Date(nowMs).toISOString(), gw, data };
}

export function appendJsonlRow(existing: string | null, row: CaptureRow): string {
  const line = JSON.stringify(row);
  if (!existing || existing.length === 0) return `${line}\n`;
  const base = existing.endsWith('\n') ? existing : `${existing}\n`;
  return `${base}${line}\n`;
}

export async function captureSnapshotToR2(
  bucket: CaptureBucket,
  gw: number,
  data: FplLiveGameweek,
  nowMs: number
): Promise<boolean> {
  if (!shouldCaptureGw38(gw, nowMs)) return false;
  const existingObject = await bucket.get(GW38_RECORDING_KEY);
  const existing = existingObject ? await existingObject.text() : null;
  const next = appendJsonlRow(existing, buildCaptureRow(gw, data, nowMs));
  await bucket.put(GW38_RECORDING_KEY, next);
  return true;
}
