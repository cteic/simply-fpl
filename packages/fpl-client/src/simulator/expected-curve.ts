import type { FplBootstrapStatic, FplEntryGameweekPicks } from '@simplyfpl/types';

import { calculateLivePoints, estimateLiveRank } from '../live-rank';
import type { ManagerDistribution } from './manager-pool';
import { expandManager } from './manager-pool';
import type { RecordingRow } from './recording';
import { recordingElapsedSeconds } from './recording';

export interface ExpectedCurvePoint {
  rowIndex: number;
  elapsedSeconds: number;
  myPoints: number;
  avgScore: number;
  expectedRank: number;
}

export interface ExpectedCurve {
  gw: number;
  preGwRank: number;
  totalManagers: number;
  officialEndRank: number;
  frames: ExpectedCurvePoint[];
}

export interface BuildExpectedCurveArgs {
  gw: number;
  rows: RecordingRow[];
  testTeam: FplEntryGameweekPicks;
  distribution: ManagerDistribution;
  bootstrap: FplBootstrapStatic;
  preGwRank: number;
  totalManagers: number;
}

function roundTo(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function scorePoolFrame(
  distribution: ManagerDistribution,
  frameIndex: number,
  rows: RecordingRow[],
  bootstrap: FplBootstrapStatic
): number[] {
  const row = rows[frameIndex];
  if (!row) return [];
  return distribution.managers.map((manager) =>
    calculateLivePoints(
      expandManager(manager, distribution.squad, distribution.gw),
      row.data,
      bootstrap
    )
  );
}

export function meanScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  let total = 0;
  for (const s of scores) total += s;
  return total / scores.length;
}

export function buildExpectedCurve({
  gw,
  rows,
  testTeam,
  distribution,
  bootstrap,
  preGwRank,
  totalManagers,
}: BuildExpectedCurveArgs): ExpectedCurve {
  const frames: ExpectedCurvePoint[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const myPoints = calculateLivePoints(testTeam, row.data, bootstrap);
    const avgScore = roundTo(meanScore(scorePoolFrame(distribution, i, rows, bootstrap)), 2);
    const estimate = estimateLiveRank(preGwRank, myPoints, avgScore);
    frames.push({
      rowIndex: i,
      elapsedSeconds: recordingElapsedSeconds(rows, i),
      myPoints,
      avgScore,
      expectedRank: estimate.liveRank,
    });
  }

  const lastFrame = frames[frames.length - 1];
  const officialEndRank = lastFrame ? lastFrame.expectedRank : preGwRank;

  return { gw, preGwRank, totalManagers, officialEndRank, frames };
}

export function findFrameNearElapsed(
  curve: ExpectedCurve,
  targetSeconds: number
): ExpectedCurvePoint | null {
  let best: ExpectedCurvePoint | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const frame of curve.frames) {
    const distance = Math.abs(frame.elapsedSeconds - targetSeconds);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = frame;
    }
  }
  return best;
}
