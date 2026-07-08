import type { RankDistribution, RankDistributionCohort, ScoreDistribution } from '@simplyfpl/types';

import { DISTRIBUTIONS } from './score-distributions/distributions.generated';

const PERCENTILE_KEYS = ['p1', 'p5', 'p10', 'p25', 'p50', 'p75', 'p90', 'p95', 'p99'] as const;
const PERCENTILE_LABELS: readonly number[] = [1, 5, 10, 25, 50, 75, 90, 95, 99];

export interface LoadDistributionOptions {
  cohort?: RankDistributionCohort;
}

export class DistributionUnavailableError extends Error {
  constructor(gw: number, cohort: RankDistributionCohort) {
    super(`no captured ${cohort} distribution for gw${gw}`);
    this.name = 'DistributionUnavailableError';
  }
}

export function loadDistribution(
  gw: number,
  cohort: RankDistributionCohort = 'overall'
): RankDistribution {
  const file = DISTRIBUTIONS[gw];
  if (!file) throw new DistributionUnavailableError(gw, cohort);
  const sample = file.cohorts[cohort];
  if (!sample) throw new DistributionUnavailableError(gw, cohort);
  return { ...sample, gw, season: file.season, cohort };
}

export function hasDistribution(gw: number, cohort: RankDistributionCohort = 'overall'): boolean {
  const file = DISTRIBUTIONS[gw];
  if (!file) return false;
  return Boolean(file.cohorts[cohort]);
}

function buildPercentileBreakpoints(distribution: ScoreDistribution): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < PERCENTILE_KEYS.length; i += 1) {
    const key = PERCENTILE_KEYS[i];
    const label = PERCENTILE_LABELS[i];
    if (key === undefined || label === undefined) continue;
    const value = distribution.percentiles[key];
    out.push([label, value]);
  }
  return out;
}

/**
 * Position a raw GW score on the cohort's empirical CDF, expressed as a
 * percentile in [0, 100]. Linear interpolation between the captured
 * (p1, p5, p10, p25, p50, p75, p90, p95, p99) breakpoints. Below p1 we
 * interpolate down to (0%, min); above p99 we interpolate up to (100%, max).
 */
export function scoreToPercentile(score: number, distribution: ScoreDistribution): number {
  const breakpoints = buildPercentileBreakpoints(distribution);
  const first = breakpoints[0];
  const last = breakpoints[breakpoints.length - 1];
  if (!first || !last) return 50;
  const [firstP, firstS] = first;
  const [lastP, lastS] = last;

  if (score <= distribution.min) return 0;
  if (score >= distribution.max) return 100;

  if (score <= firstS) {
    if (firstS === distribution.min) return firstP;
    const fraction = (score - distribution.min) / (firstS - distribution.min);
    return Math.max(0, firstP * fraction);
  }

  for (let i = 1; i < breakpoints.length; i += 1) {
    const lo = breakpoints[i - 1];
    const hi = breakpoints[i];
    if (!lo || !hi) continue;
    const [pLo, sLo] = lo;
    const [pHi, sHi] = hi;
    if (score <= sHi) {
      if (sHi === sLo) return pHi;
      return pLo + (pHi - pLo) * ((score - sLo) / (sHi - sLo));
    }
  }

  if (lastS === distribution.max) return lastP;
  const tailFraction = (score - lastS) / (distribution.max - lastS);
  return Math.min(100, lastP + (100 - lastP) * tailFraction);
}

export interface EstimateRankOptions {
  totalEntries: number;
}

/**
 * Estimate the overall FPL rank a manager scoring `score` would land at,
 * using the cohort's score distribution as a percentile model and mapping
 * (1 - percentile) → rank against the league-wide entry count. Result is
 * clamped to [1, totalEntries].
 */
export function estimateRankFromScore(
  score: number,
  distribution: ScoreDistribution,
  totalEntries: number
): number {
  if (!Number.isFinite(score)) throw new Error('score must be a finite number');
  if (!Number.isFinite(totalEntries) || totalEntries <= 0) {
    throw new Error('totalEntries must be a positive number');
  }
  const percentile = scoreToPercentile(score, distribution);
  const fractionAhead = Math.max(0, Math.min(1, (100 - percentile) / 100));
  const rank = Math.round(fractionAhead * totalEntries);
  return Math.max(1, Math.min(totalEntries, rank || 1));
}

export interface DistributionRankEstimate {
  liveRank: number;
  movement: number;
  direction: 'up' | 'down' | 'flat';
  percentile: number;
}

/**
 * Combine the score → rank lookup with the manager's pre-GW rank so the UI
 * can show both an absolute estimate and a signed movement. Movement is
 * positive when the live rank is better than the pre-GW rank.
 */
export function estimateLiveRankFromDistribution(
  preGwRank: number,
  livePoints: number,
  distribution: ScoreDistribution,
  totalEntries: number
): DistributionRankEstimate {
  const percentile = scoreToPercentile(livePoints, distribution);
  const liveRank = estimateRankFromScore(livePoints, distribution, totalEntries);
  const movement = preGwRank > 0 ? preGwRank - liveRank : 0;
  let direction: DistributionRankEstimate['direction'] = 'flat';
  if (movement > 0) direction = 'up';
  else if (movement < 0) direction = 'down';
  return { liveRank, movement, direction, percentile };
}
