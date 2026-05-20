import { buildExpectedCurve } from '@simplyfpl/fpl-client';
import type { ManagerDistribution, RecordingRow } from '@simplyfpl/fpl-client';
import type { FplBootstrapStatic, FplEntryGameweekPicks } from '@simplyfpl/types';

export interface RankTrajectoryPoint {
  rowIndex: number;
  elapsedSeconds: number;
  myPoints: number;
  avgScore: number;
  estimatedRank: number;
}

export interface SimulateRankArgs {
  gw: number;
  rows: RecordingRow[];
  testTeam: FplEntryGameweekPicks;
  distribution: ManagerDistribution;
  bootstrap: FplBootstrapStatic;
  preGwRank: number;
  totalManagers: number;
}

export interface RankSimulationResult {
  trajectory: RankTrajectoryPoint[];
  officialEndRank: number;
}

export function simulateRankTrajectory({
  gw,
  rows,
  testTeam,
  distribution,
  bootstrap,
  preGwRank,
  totalManagers,
}: SimulateRankArgs): RankSimulationResult {
  const curve = buildExpectedCurve({
    gw,
    rows,
    testTeam,
    distribution,
    bootstrap,
    preGwRank,
    totalManagers,
  });
  const trajectory = curve.frames.map((frame) => ({
    rowIndex: frame.rowIndex,
    elapsedSeconds: frame.elapsedSeconds,
    myPoints: frame.myPoints,
    avgScore: frame.avgScore,
    estimatedRank: frame.expectedRank,
  }));
  return { trajectory, officialEndRank: curve.officialEndRank };
}

export function relativeError(actual: number, expected: number): number {
  if (expected === 0) return Math.abs(actual - expected);
  return Math.abs(actual - expected) / Math.abs(expected);
}

export function frameNearestElapsed(
  trajectory: RankTrajectoryPoint[],
  targetSeconds: number
): RankTrajectoryPoint | null {
  let best: RankTrajectoryPoint | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const point of trajectory) {
    const distance = Math.abs(point.elapsedSeconds - targetSeconds);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = point;
    }
  }
  return best;
}
