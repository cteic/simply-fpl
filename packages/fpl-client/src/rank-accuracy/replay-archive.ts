import { estimateLiveRank } from '../live-rank';

export type PointsMode = 'gross' | 'net';

export interface ArchiveGwHistory {
  event: number;
  points: number;
  overall_rank: number;
  event_transfers_cost: number;
}

export interface ArchiveEntry {
  entryId: number;
  current: ArchiveGwHistory[];
}

export interface ArchiveBootstrap {
  totalPlayers: number;
  averageEntryScoreByEvent: Map<number, number>;
}

export interface ReplaySample {
  entryId: number;
  gw: number;
  preGwRank: number;
  grossPoints: number;
  netPoints: number;
  avgEntryScore: number;
  trueRank: number;
}

export interface ScoredSample {
  entryId: number;
  gw: number;
  trueRank: number;
  predictedRank: number;
  absError: number;
  signedError: number;
  absPctError: number;
  signedPctError: number;
}

export interface BandStats {
  band: string;
  lowerRank: number;
  upperRank: number;
  count: number;
  medianAbsError: number;
  medianAbsPctError: number;
  medianSignedError: number;
  medianSignedPctError: number;
}

export interface ReplayResult {
  pointsMode: PointsMode;
  count: number;
  skipped: number;
  medianAbsError: number;
  medianAbsPctError: number;
  meanSignedError: number;
  medianSignedError: number;
  medianSignedPctError: number;
  bands: BandStats[];
}

export interface RankBand {
  band: string;
  lowerRank: number;
  upperRank: number;
}

export const RANK_BANDS: RankBand[] = [
  { band: '1-10k', lowerRank: 1, upperRank: 10_000 },
  { band: '10k-100k', lowerRank: 10_000, upperRank: 100_000 },
  { band: '100k-500k', lowerRank: 100_000, upperRank: 500_000 },
  { band: '500k-1M', lowerRank: 500_000, upperRank: 1_000_000 },
  { band: '1M-3M', lowerRank: 1_000_000, upperRank: 3_000_000 },
  { band: '3M+', lowerRank: 3_000_000, upperRank: Number.POSITIVE_INFINITY },
];

/**
 * Expand a single archived entry into the per-gameweek replay samples the
 * estimator can be scored against. For gameweek N (N >= 2) the model inputs are
 * reconstructed from the archive exactly as the live app would have seen them:
 * the prior gameweek's end-of-GW overall rank as the baseline, the entry's own
 * gameweek score (both gross and net of the transfer hit), and the gameweek's
 * average entry score from bootstrap. The truth is the entry's real
 * end-of-GW-N overall rank.
 */
export function buildSamplesForEntry(
  entry: ArchiveEntry,
  bootstrap: ArchiveBootstrap
): ReplaySample[] {
  const samples: ReplaySample[] = [];
  const byEvent = new Map(entry.current.map((row) => [row.event, row]));

  for (const row of entry.current) {
    const gw = row.event;
    if (gw < 2) continue;
    const prior = byEvent.get(gw - 1);
    if (!prior) continue;
    const preGwRank = prior.overall_rank;
    if (preGwRank <= 0) continue;
    const avgEntryScore = bootstrap.averageEntryScoreByEvent.get(gw);
    if (typeof avgEntryScore !== 'number') continue;
    if (row.overall_rank <= 0) continue;

    const grossPoints = row.points;
    const netPoints = row.points - row.event_transfers_cost;

    samples.push({
      entryId: entry.entryId,
      gw,
      preGwRank,
      grossPoints,
      netPoints,
      avgEntryScore,
      trueRank: row.overall_rank,
    });
  }

  return samples;
}

export function buildSamples(entries: ArchiveEntry[], bootstrap: ArchiveBootstrap): ReplaySample[] {
  const all: ReplaySample[] = [];
  for (const entry of entries) {
    for (const sample of buildSamplesForEntry(entry, bootstrap)) {
      all.push(sample);
    }
  }
  return all;
}

function median(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const high = sorted[mid];
  if (high === undefined) return Number.NaN;
  if (sorted.length % 2 === 1) return high;
  const low = sorted[mid - 1];
  if (low === undefined) return high;
  return (low + high) / 2;
}

function mean(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

/**
 * Score a single sample against the shipping estimator for the chosen points
 * mode. `signedError` is `predicted - true`: a negative value means the model
 * placed the manager higher up the table (smaller rank number) than reality —
 * the over-climb symptom the RFC describes.
 */
export function scoreSample(sample: ReplaySample, mode: PointsMode): ScoredSample {
  const points = mode === 'gross' ? sample.grossPoints : sample.netPoints;
  const { liveRank } = estimateLiveRank(sample.preGwRank, points, sample.avgEntryScore);
  const signedError = liveRank - sample.trueRank;
  const absError = Math.abs(signedError);
  return {
    entryId: sample.entryId,
    gw: sample.gw,
    trueRank: sample.trueRank,
    predictedRank: liveRank,
    absError,
    signedError,
    absPctError: absError / sample.trueRank,
    signedPctError: signedError / sample.trueRank,
  };
}

function bandFor(trueRank: number): RankBand | undefined {
  return RANK_BANDS.find((band) => trueRank >= band.lowerRank && trueRank < band.upperRank);
}

function statsForBand(band: RankBand, scored: ScoredSample[]): BandStats {
  const inBand = scored.filter((sample) => bandFor(sample.trueRank)?.band === band.band);
  return {
    band: band.band,
    lowerRank: band.lowerRank,
    upperRank: band.upperRank,
    count: inBand.length,
    medianAbsError: median(inBand.map((sample) => sample.absError)),
    medianAbsPctError: median(inBand.map((sample) => sample.absPctError)),
    medianSignedError: median(inBand.map((sample) => sample.signedError)),
    medianSignedPctError: median(inBand.map((sample) => sample.signedPctError)),
  };
}

/**
 * Run the full offline replay for one points mode and aggregate the error
 * metrics overall and per true-rank band. This is the model-agnostic gate: it
 * calls the real shipping `estimateLiveRank`, so tightening or replacing the
 * model is reflected here with no harness change.
 */
export function replayArchive(
  entries: ArchiveEntry[],
  bootstrap: ArchiveBootstrap,
  mode: PointsMode
): ReplayResult {
  const samples = buildSamples(entries, bootstrap);
  const scored = samples.map((sample) => scoreSample(sample, mode));

  return {
    pointsMode: mode,
    count: scored.length,
    skipped: 0,
    medianAbsError: median(scored.map((sample) => sample.absError)),
    medianAbsPctError: median(scored.map((sample) => sample.absPctError)),
    meanSignedError: mean(scored.map((sample) => sample.signedError)),
    medianSignedError: median(scored.map((sample) => sample.signedError)),
    medianSignedPctError: median(scored.map((sample) => sample.signedPctError)),
    bands: RANK_BANDS.map((band) => statsForBand(band, scored)),
  };
}
