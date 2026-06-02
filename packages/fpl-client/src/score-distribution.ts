import type { ScoreDistribution, ScoreHistogramBin, ScorePercentiles } from '@simplyfpl/types';

export interface ScoreDistributionOptions {
  binSize?: number;
}

const DEFAULT_BIN_SIZE = 5;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function percentile(sorted: number[], p: number): number {
  const n = sorted.length;
  if (n === 1) return sorted[0] ?? 0;
  const rank = (p / 100) * (n - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const loVal = sorted[lo] ?? 0;
  const hiVal = sorted[hi] ?? 0;
  if (lo === hi) return loVal;
  return loVal + (hiVal - loVal) * (rank - lo);
}

function computePercentiles(sorted: number[]): ScorePercentiles {
  return {
    p1: round1(percentile(sorted, 1)),
    p5: round1(percentile(sorted, 5)),
    p10: round1(percentile(sorted, 10)),
    p25: round1(percentile(sorted, 25)),
    p50: round1(percentile(sorted, 50)),
    p75: round1(percentile(sorted, 75)),
    p90: round1(percentile(sorted, 90)),
    p95: round1(percentile(sorted, 95)),
    p99: round1(percentile(sorted, 99)),
  };
}

function buildHistogram(sorted: number[], binSize: number): ScoreHistogramBin[] {
  const lo = Math.min(...sorted);
  const hi = Math.max(...sorted);
  const start = Math.floor(lo / binSize) * binSize;
  const bins: ScoreHistogramBin[] = [];
  for (let binMin = start; binMin <= hi; binMin += binSize) {
    const binMax = binMin + binSize;
    let count = 0;
    for (const score of sorted) {
      if (score >= binMin && score < binMax) count += 1;
    }
    bins.push({ min: binMin, max: binMax, count });
  }
  return bins;
}

export function computeScoreDistribution(
  scores: number[],
  options: ScoreDistributionOptions = {}
): ScoreDistribution {
  if (scores.length === 0) {
    throw new Error('cannot compute a score distribution from an empty sample');
  }
  const binSize = options.binSize ?? DEFAULT_BIN_SIZE;
  if (binSize <= 0) {
    throw new Error('binSize must be a positive number');
  }
  const sorted = [...scores].sort((a, b) => a - b);
  const sampleSize = sorted.length;
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  return {
    sampleSize,
    min: Math.min(...sorted),
    max: Math.max(...sorted),
    mean: round1(sum / sampleSize),
    median: round1(percentile(sorted, 50)),
    percentiles: computePercentiles(sorted),
    histogram: buildHistogram(sorted, binSize),
  };
}
