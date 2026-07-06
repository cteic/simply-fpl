import type { FplLiveGameweek } from '@simplyfpl/types';

export interface RecordingRow {
  ts: string;
  gw: number;
  data: FplLiveGameweek;
}

function isFplLiveGameweek(value: unknown): value is FplLiveGameweek {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { elements?: unknown };
  return Array.isArray(candidate.elements);
}

export function isRecordingRow(value: unknown): value is RecordingRow {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { ts?: unknown; gw?: unknown; data?: unknown };
  if (typeof candidate.ts !== 'string') return false;
  if (typeof candidate.gw !== 'number') return false;
  if (!isFplLiveGameweek(candidate.data)) return false;
  return !Number.isNaN(Date.parse(candidate.ts));
}

export function parseRecording(text: string): RecordingRow[] {
  const rows: RecordingRow[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (isRecordingRow(parsed)) rows.push(parsed);
  }
  return rows;
}

export function normaliseRecordingRows(rows: RecordingRow[]): RecordingRow[] {
  const valid = rows.filter(isRecordingRow);
  return [...valid].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
}

export function recordingToJsonl(rows: RecordingRow[]): string {
  return rows.map((row) => JSON.stringify(row)).join('\n') + '\n';
}

export function recordingElapsedSeconds(rows: RecordingRow[], rowIndex: number): number {
  const first = rows[0];
  const row = rows[rowIndex];
  if (!first || !row) return 0;
  return Math.round((Date.parse(row.ts) - Date.parse(first.ts)) / 1000);
}
