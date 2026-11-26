import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplLiveGameweek,
  LiveRankEntry,
  RankCurve,
  ScoreDistribution,
} from '@simplyfpl/types';

import type { BonusPrediction } from './bonus-points';
import {
  estimateLiveRankFromDistribution,
  hasDistribution,
  loadDistribution,
} from './estimate-rank';
import { curveMatchesGameweek, rankForPoints } from './rank-curve';

/**
 * Calculate live points for a set of picks against live gameweek data.
 * Accounts for captain multiplier and active chip (TC, BB, FH).
 * Optionally folds in predicted bonus from `predictBonusPoints` — provisional
 * bonus is added on top of `total_points`; non-provisional bonus is assumed to
 * already be reflected in FPL's `total_points`.
 */
export function calculateLivePoints(
  picks: FplEntryGameweekPicks,
  liveData: FplLiveGameweek,
  _bootstrap: FplBootstrapStatic,
  bonusMap?: Map<number, BonusPrediction>
): number {
  const liveMap = new Map(liveData.elements.map((e) => [e.id, e]));
  const isBenchBoost = picks.active_chip === 'bboost';

  // Active players: positions 1-11 (or 1-15 on bench boost)
  const activePicks = isBenchBoost ? picks.picks : picks.picks.filter((p) => p.position <= 11);

  let totalPoints = 0;

  for (const pick of activePicks) {
    const live = liveMap.get(pick.element);
    if (!live) continue;

    let points = live.stats.total_points;
    const bonusInfo = bonusMap?.get(pick.element);
    if (bonusInfo && bonusInfo.provisional) {
      points += bonusInfo.bonus;
    }

    points = points * pick.multiplier;

    totalPoints += points;
  }

  // Deduct transfer hit
  totalPoints -= picks.entry_history.event_transfers_cost;

  return totalPoints;
}

/**
 * Build live rank entries for a mini-league.
 * Pass an array of [entry history + picks] tuples alongside live data.
 */
export function buildLiveLeagueTable(
  entries: Array<{
    entryId: number;
    entryName: string;
    playerName: string;
    previousRank: number;
    picks: FplEntryGameweekPicks;
  }>,
  liveData: FplLiveGameweek,
  bootstrap: FplBootstrapStatic
): LiveRankEntry[] {
  const withPoints = entries.map((entry) => ({
    entryId: entry.entryId,
    entryName: entry.entryName,
    playerName: entry.playerName,
    livePoints: calculateLivePoints(entry.picks, liveData, bootstrap),
    previousRank: entry.previousRank,
    picks: entry.picks.picks,
  }));

  // Sort by live points descending
  withPoints.sort((a, b) => b.livePoints - a.livePoints);

  return withPoints.map((entry, index) => ({
    ...entry,
    liveRank: index + 1,
    rankMovement: entry.previousRank - (index + 1),
  }));
}

/**
 * Get current gameweek from bootstrap data.
 */
export function getCurrentGameweek(bootstrap: FplBootstrapStatic): number | null {
  const current = bootstrap.events.find((e) => e.is_current);
  return current?.id ?? null;
}

/**
 * Get next gameweek from bootstrap data.
 */
export function getNextGameweek(bootstrap: FplBootstrapStatic): number | null {
  const next = bootstrap.events.find((e) => e.is_next);
  return next?.id ?? null;
}

export interface NextDeadline {
  event: number;
  deadlineTime: string;
}

/**
 * The upcoming gameweek deadline (the `is_next` event's `deadline_time`).
 * Returns null at the end of the season when there is no next event.
 */
export function getNextDeadline(bootstrap: FplBootstrapStatic): NextDeadline | null {
  const next = bootstrap.events.find((e) => e.is_next);
  if (!next) return null;
  return { event: next.id, deadlineTime: next.deadline_time };
}

/**
 * Human-readable time-until-deadline, coarsened to the two most significant
 * units (e.g. "2d 4h", "4h 32m", "12m 30s", "45s"). Returns "closed" once the
 * deadline has passed.
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'closed';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export type RankEstimateSource =
  | 'official-curve'
  | 'live-cohort'
  | 'captured-same-season'
  | 'captured-prior-season-scaled'
  | 'flat-heuristic';

export interface LiveRankEstimate {
  liveRank: number;
  movement: number;
  direction: 'up' | 'down' | 'flat';
  source: RankEstimateSource;
}

const PLACES_PER_POINT = 700;

export function estimateLiveRank(
  preGwRank: number,
  livePoints: number,
  avgEntryScore: number
): LiveRankEstimate {
  const delta = livePoints - avgEntryScore;
  const movement = Math.round(delta * PLACES_PER_POINT);
  const liveRank = Math.max(1, preGwRank - movement);
  let direction: LiveRankEstimate['direction'] = 'flat';
  if (movement > 0) direction = 'up';
  else if (movement < 0) direction = 'down';
  return { liveRank, movement, direction, source: 'flat-heuristic' };
}

export interface CurveEstimateInput {
  curve: RankCurve;
  /** The manager's cumulative total before this gameweek's points. */
  preGwTotal: number;
  /** The manager's points so far this gameweek, after any transfer hit. */
  livePoints: number;
  /** What the field has averaged so far this gameweek. */
  fieldLiveAverage: number;
  /** The manager's settled rank going into the gameweek, for movement only. */
  preGwRank: number;
}

/**
 * Live rank read straight off FPL's own points-to-rank curve.
 *
 * The curve maps a cumulative total to an exact rank, captured when the
 * previous gameweek settled. During a live gameweek every entry's total grows,
 * so the whole distribution slides right by roughly what the field has scored.
 * Subtracting the field's live average from this manager's live total puts them
 * back on the curve's own scale:
 *
 *   liveRank = curve(preGwTotal + livePoints - fieldLiveAverage)
 *
 * This is the same shape as the flat heuristic, which moves a fixed 700 places
 * per point above average. The difference is that the slope here is the field's
 * real local density instead of a constant, which is why it is roughly ten
 * times more accurate. It also works from the manager's total rather than their
 * rank, so two managers on the same score but far apart in the table no longer
 * collapse to the same answer.
 *
 * Treating every rival as scoring exactly the average ignores the spread of
 * gameweek scores, which compresses the estimate slightly toward the middle.
 * That error is second-order next to getting the slope right.
 */
export function estimateLiveRankFromCurve(input: CurveEstimateInput): LiveRankEstimate {
  const liveTotal = input.preGwTotal + input.livePoints;
  const shifted = liveTotal - input.fieldLiveAverage;
  const liveRank = rankForPoints(input.curve, shifted);
  const movement = input.preGwRank - liveRank;
  let direction: LiveRankEstimate['direction'] = 'flat';
  if (movement > 0) direction = 'up';
  else if (movement < 0) direction = 'down';
  return { liveRank, movement, direction, source: 'official-curve' };
}

export function getCurrentSeasonYear(bootstrap: FplBootstrapStatic): number | null {
  const gw1 = bootstrap.events.find((e) => e.id === 1);
  if (!gw1) return null;
  return new Date(gw1.deadline_time).getUTCFullYear();
}

export const APPROX_TOTAL_FPL_ENTRIES = 11_000_000;

export function getRankedEntryCount(bootstrap: FplBootstrapStatic | undefined): number {
  if (!bootstrap || !Array.isArray(bootstrap.events)) return APPROX_TOTAL_FPL_ENTRIES;
  const current = bootstrap.events.find((e) => e.is_current);
  if (current && typeof current.ranked_count === 'number' && current.ranked_count > 0) {
    return current.ranked_count;
  }
  let latest = 0;
  for (const event of bootstrap.events) {
    if (typeof event.ranked_count === 'number' && event.ranked_count > latest) {
      latest = event.ranked_count;
    }
  }
  return latest > 0 ? latest : APPROX_TOTAL_FPL_ENTRIES;
}

export interface EstimateLiveRankSmartOptions {
  totalEntries?: number;
  liveAggregate?: ScoreDistribution;
  bootstrap?: FplBootstrapStatic;
  /** FPL's own points-to-rank curve. Used whenever `preGwTotal` is also set. */
  curve?: RankCurve;
  /** The manager's cumulative total before this gameweek. Required by `curve`. */
  preGwTotal?: number;
  /**
   * Opt into the captured score-distribution chain.
   *
   * Off by default. Replaying the archive put the distribution estimator at a
   * 148.8% median absolute error against the flat heuristic's 12.6%, because
   * `estimateRankFromScore` maps one gameweek's score to a rank and discards
   * the manager's standing. See docs/notes/fpl-live-percentile-2026-11-26.md.
   */
  useDistributionModel?: boolean;
}

/**
 * Live-rank estimator with a confidence chain, best source first.
 *
 * Priority (highest to lowest):
 *   1. official-curve — `opts.curve` plus `opts.preGwTotal`, when the curve is
 *      the one from the gameweek before `gw`. FPL's own points-to-rank mapping
 *      for the whole field.
 *   2. live-cohort — `opts.liveAggregate`, a score distribution sampled from
 *      the worker cohort for the current GW.
 *   3. flat-heuristic — `estimateLiveRank`, the flat 700-places-per-point
 *      model. 12.6% median absolute error, and the default fallback.
 *
 * The captured score-distribution chain sits behind `useDistributionModel`
 * because it measured 12x worse than the flat model it replaced. With the flag
 * set, levels 2a and 2b are a same-season captured distribution and a
 * prior-season one rescaled by (prior_mean / current_avg).
 *
 * The returned `source` field tells callers which level was used so the UI can
 * display a confidence hint.
 */
export function estimateLiveRankSmart(
  gw: number,
  preGwRank: number,
  livePoints: number,
  avgEntryScore: number,
  opts: EstimateLiveRankSmartOptions = {}
): LiveRankEstimate {
  const { liveAggregate, bootstrap, curve, preGwTotal } = opts;
  const totalEntries = opts.totalEntries ?? getRankedEntryCount(bootstrap);

  // A curve from the wrong gameweek shifts the whole x-axis by a gameweek's
  // scoring. Measured, that moved estimates by around 40% while still
  // reporting the curve as its source, so a mismatch falls through to the next
  // level instead of being used.
  if (curve && typeof preGwTotal === 'number' && curveMatchesGameweek(curve, gw)) {
    return estimateLiveRankFromCurve({
      curve,
      preGwTotal,
      livePoints,
      fieldLiveAverage: avgEntryScore,
      preGwRank,
    });
  }

  if (liveAggregate) {
    const { liveRank, movement, direction } = estimateLiveRankFromDistribution(
      preGwRank,
      livePoints,
      liveAggregate,
      totalEntries
    );
    return { liveRank, movement, direction, source: 'live-cohort' };
  }

  if (opts.useDistributionModel !== true || !hasDistribution(gw, 'overall')) {
    return estimateLiveRank(preGwRank, livePoints, avgEntryScore);
  }

  const distribution = loadDistribution(gw, 'overall');
  const currentSeasonYear = bootstrap ? getCurrentSeasonYear(bootstrap) : null;
  const isSameSeason = currentSeasonYear === null || distribution.season === currentSeasonYear;

  if (isSameSeason) {
    const { liveRank, movement, direction } = estimateLiveRankFromDistribution(
      preGwRank,
      livePoints,
      distribution,
      totalEntries
    );
    return { liveRank, movement, direction, source: 'captured-same-season' };
  }

  const scaledScore =
    distribution.mean > 0
      ? (livePoints * distribution.mean) / Math.max(1, avgEntryScore)
      : livePoints;
  const { liveRank, movement, direction } = estimateLiveRankFromDistribution(
    preGwRank,
    scaledScore,
    distribution,
    totalEntries
  );
  return { liveRank, movement, direction, source: 'captured-prior-season-scaled' };
}

export interface RankDetails {
  oldRank: number;
  preSubsRank: number;
  postSubsRank: number;
  changePct: number;
}

export function computeRankDetails(
  preGwRank: number,
  livePoints: number,
  postSubsPoints: number,
  avgEntryScore: number,
  gw?: number,
  opts: EstimateLiveRankSmartOptions = {}
): RankDetails | null {
  if (preGwRank <= 0) return null;
  const preSubs =
    gw !== undefined
      ? estimateLiveRankSmart(gw, preGwRank, livePoints, avgEntryScore, opts)
      : estimateLiveRank(preGwRank, livePoints, avgEntryScore);
  const postSubs =
    gw !== undefined
      ? estimateLiveRankSmart(gw, preGwRank, postSubsPoints, avgEntryScore, opts)
      : estimateLiveRank(preGwRank, postSubsPoints, avgEntryScore);
  return {
    oldRank: preGwRank,
    preSubsRank: preSubs.liveRank,
    postSubsRank: postSubs.liveRank,
    changePct: (postSubs.movement / preGwRank) * 100,
  };
}
