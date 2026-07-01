import type { ManagerDistribution, RecordingRow } from '@simplyfpl/fpl-client';
import { buildExpectedCurve, normaliseRecordingRows, parseRecording } from '@simplyfpl/fpl-client';
import type { FplBootstrapStatic, FplEntryGameweekPicks } from '@simplyfpl/types';

export interface CohortReplayInput {
  recordingJsonl: string;
  testTeam: FplEntryGameweekPicks;
  distribution: ManagerDistribution;
  bootstrap: FplBootstrapStatic;
  preGwRank: number;
  totalManagers: number;
  speed: number;
}

export interface ReplayFrame {
  rowIndex: number;
  elapsedSeconds: number;
  emitOffsetMs: number;
  myPoints: number;
  avgScore: number;
  estimatedRank: number;
}

export interface CohortReplayResult {
  gw: number;
  preGwRank: number;
  totalManagers: number;
  officialEndRank: number;
  speed: number;
  recordingSpanMs: number;
  replaySpanMs: number;
  frames: ReplayFrame[];
}

export function replayEmitOffsetMs(rows: RecordingRow[], rowIndex: number, speed: number): number {
  const first = rows[0];
  const row = rows[rowIndex];
  if (!first || !row || speed <= 0) return 0;
  return (Date.parse(row.ts) - Date.parse(first.ts)) / speed;
}

export function runCohortReplay(input: CohortReplayInput): CohortReplayResult {
  const { recordingJsonl, testTeam, distribution, bootstrap, preGwRank, totalManagers, speed } =
    input;
  const rows = normaliseRecordingRows(parseRecording(recordingJsonl));
  const gw = rows[0]?.gw ?? distribution.gw;
  const curve = buildExpectedCurve({
    gw,
    rows,
    testTeam,
    distribution,
    bootstrap,
    preGwRank,
    totalManagers,
  });

  const frames: ReplayFrame[] = curve.frames.map((frame) => ({
    rowIndex: frame.rowIndex,
    elapsedSeconds: frame.elapsedSeconds,
    emitOffsetMs: replayEmitOffsetMs(rows, frame.rowIndex, speed),
    myPoints: frame.myPoints,
    avgScore: frame.avgScore,
    estimatedRank: frame.expectedRank,
  }));

  const firstRow = rows[0];
  const finalRow = rows[rows.length - 1];
  const recordingSpanMs =
    firstRow && finalRow ? Date.parse(finalRow.ts) - Date.parse(firstRow.ts) : 0;

  return {
    gw,
    preGwRank,
    totalManagers,
    officialEndRank: curve.officialEndRank,
    speed,
    recordingSpanMs,
    replaySpanMs: speed > 0 ? recordingSpanMs / speed : recordingSpanMs,
    frames,
  };
}

export function relativeError(actual: number, expected: number): number {
  if (expected === 0) return actual === 0 ? 0 : Number.POSITIVE_INFINITY;
  return Math.abs(actual - expected) / Math.abs(expected);
}

export function frameNearestElapsed(
  frames: ReplayFrame[],
  targetSeconds: number
): ReplayFrame | null {
  let best: ReplayFrame | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const frame of frames) {
    const distance = Math.abs(frame.elapsedSeconds - targetSeconds);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = frame;
    }
  }
  return best;
}
