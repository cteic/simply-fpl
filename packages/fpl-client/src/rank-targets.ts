import type { FplBootstrapStatic, RankCurve, RankTarget, RankTargets } from '@simplyfpl/types';

import { curveMatchesGameweek, pointsForRank, rankForPoints } from './rank-curve';

/**
 * Milestones a manager actually talks about.
 *
 * The rungs span the whole field, top to bottom. A ladder that stopped at a
 * million handed everyone below it the same target: a manager at 10.7M was
 * told the top million needed 382 more points in one gameweek, which is not a
 * target. A ladder that started at a thousand left anyone already inside the
 * top thousand with nothing to aim at, which is the most engaged manager there
 * is.
 */
export const DEFAULT_TARGET_RANKS: readonly number[] = [
  10, 100, 1_000, 10_000, 100_000, 500_000, 1_000_000, 2_000_000, 5_000_000,
];

/**
 * Most gameweek points a target may ask for before it stops being a target.
 *
 * FPL's own highest entry score for a gameweek runs to roughly 140, so a
 * target asking for more than this cannot be reached in the gameweek it is
 * shown in, and an unreachable target is worse than none. Callers holding the
 * bootstrap should pass the season's real high instead.
 */
export const REACHABLE_GW_POINTS = 150;

/**
 * The best single-gameweek score any entry has posted this season.
 *
 * FPL publishes `highest_score` per event, so the reachable bound can come
 * from what has actually happened rather than a guessed ceiling. Falls back to
 * `REACHABLE_GW_POINTS` before any gameweek has a figure.
 */
export function seasonHighestGwScore(bootstrap: FplBootstrapStatic): number {
  let highest = 0;
  for (const event of bootstrap.events) {
    if (typeof event.highest_score === 'number' && event.highest_score > highest) {
      highest = event.highest_score;
    }
  }
  return highest > 0 ? highest : REACHABLE_GW_POINTS;
}

export interface RankTargetsInput {
  curve: RankCurve;
  /** The live gameweek. The curve must be the one from the gameweek before it. */
  gw: number;
  /** The manager's cumulative total before this gameweek. */
  preGwTotal: number;
  /** Their points so far this gameweek, after any transfer hit. */
  livePoints: number;
  /** What the field has averaged so far this gameweek. */
  fieldLiveAverage: number;
  /** Their settled rank going into the gameweek. */
  preGwRank: number;
  ranks?: readonly number[];
  /** Overrides `REACHABLE_GW_POINTS`, ideally with the season's highest score. */
  maxReachableGwPoints?: number;
}

/**
 * Total points needed to finish this gameweek at a given rank.
 *
 * The curve maps settled totals from the previous gameweek, and the field
 * slides right by roughly what it has scored, so the total that lands on rank
 * R is the curve's total for R plus the field's live average. This is the exact
 * inverse of the live-rank estimate: feeding the result back through
 * `rankForPoints` returns the rank asked for.
 */
function totalForRank(curve: RankCurve, rank: number, fieldLiveAverage: number): number {
  return pointsForRank(curve, rank) + fieldLiveAverage;
}

function buildTarget(input: RankTargetsInput, rank: number, maxReachable: number): RankTarget {
  const totalPointsNeeded = totalForRank(input.curve, rank, input.fieldLiveAverage);
  const gwPointsNeeded = totalPointsNeeded - input.preGwTotal;
  const pointsFromHere = gwPointsNeeded - input.livePoints;
  return {
    rank,
    totalPointsNeeded: Math.round(totalPointsNeeded),
    gwPointsNeeded: Math.round(gwPointsNeeded),
    pointsFromHere: Math.round(pointsFromHere),
    achieved: pointsFromHere <= 0,
    reachable: pointsFromHere <= maxReachable,
  };
}

/**
 * What a manager needs to score to reach a given rank, and what keeps them
 * where they are.
 *
 * FPL publishes no live rank, let alone a target, so this is only possible
 * because the curve inverts. Returns null when the inputs cannot place the
 * manager on the curve at all, rather than inventing a figure: a missing
 * pre-gameweek total would read as zero and make every target look
 * unreachable.
 */
export function computeRankTargets(input: RankTargetsInput): RankTargets | null {
  if (!Array.isArray(input.curve.points) || input.curve.points.length === 0) return null;
  if (!Number.isFinite(input.preGwTotal) || input.preGwTotal <= 0) return null;
  if (!Number.isFinite(input.livePoints)) return null;
  if (!Number.isFinite(input.fieldLiveAverage)) return null;
  if (!Number.isFinite(input.preGwRank) || input.preGwRank <= 0) return null;
  if (!curveMatchesGameweek(input.curve, input.gw)) return null;

  const { rankedCount } = input.curve;
  const candidates = (input.ranks ?? DEFAULT_TARGET_RANKS)
    .filter((rank) => Number.isFinite(rank) && rank >= 1 && rank <= rankedCount)
    .slice()
    .sort((a, b) => a - b);

  const maxReachable = input.maxReachableGwPoints ?? REACHABLE_GW_POINTS;
  const targets = candidates.map((rank) => buildTarget(input, rank, maxReachable));

  // Holding position means matching the field, exactly. A manager keeps their
  // place when their total moves by as much as the distribution shifts, so the
  // figure is the field average and nothing else.
  //
  // Deriving it by inverting their pre-gameweek rank instead would route an
  // exact answer through two lossy steps, and would quietly produce nonsense
  // whenever the rank and the total disagree.
  const holdPoints = Math.round(input.fieldLiveAverage);
  const holdFromHere = Math.round(input.fieldLiveAverage - input.livePoints);
  const holdRank = rankForPoints(input.curve, input.preGwTotal);

  const liveRank = rankForPoints(
    input.curve,
    input.preGwTotal + input.livePoints - input.fieldLiveAverage
  );

  // The nearest milestone still ahead of them: the largest rank number smaller
  // than where they stand, which is the smallest step up. Unreachable rungs are
  // skipped, so a manager deep in the field is shown nothing rather than a
  // score no one has ever posted.
  let nextTarget: RankTarget | null = null;
  for (const target of targets) {
    if (target.rank < liveRank && target.reachable) nextTarget = target;
  }

  return { liveRank, holdRank, holdPoints, holdFromHere, targets, nextTarget };
}
