import type {
  FplEntryGameweekPicks,
  ScoreDistribution,
  ScoreHistogramBin,
  ScorePercentiles,
} from '@simplyfpl/types';

export type CohortTier = 'top_10k' | 'top_100k' | 'overall' | 'legendary';

export interface OwnershipCounts {
  starting: number;
  bench: number;
}

export interface PartialAggregate {
  captains: Map<number, number>;
  ownership: Map<number, OwnershipCounts>;
  transfersIn: Map<number, number>;
  transfersOut: Map<number, number>;
  chips: Record<string, number>;
  entriesSeen: number;
  seenEntryIds: Set<number>;
  totalEventPoints: number;
  scoreHistogram: Map<number, number>;
}

export interface CohortSnapshotPayload {
  captains: Array<{ player_id: number; count: number }>;
  ownership: Array<{ player_id: number; starting_count: number; bench_count: number }>;
  transfers_in: Array<{ player_id: number; count: number }>;
  transfers_out: Array<{ player_id: number; count: number }>;
  chips: Record<string, number>;
  entries_sampled: number;
  avg_event_points: number;
  score_distribution?: ScoreDistribution;
}

export function emptyAggregate(): PartialAggregate {
  return {
    captains: new Map(),
    ownership: new Map(),
    transfersIn: new Map(),
    transfersOut: new Map(),
    chips: {},
    entriesSeen: 0,
    seenEntryIds: new Set(),
    totalEventPoints: 0,
    scoreHistogram: new Map(),
  };
}

export function mergePicks(
  agg: PartialAggregate,
  entryId: number,
  picks: FplEntryGameweekPicks
): PartialAggregate {
  if (agg.seenEntryIds.has(entryId)) return agg;
  agg.seenEntryIds.add(entryId);
  agg.entriesSeen += 1;
  const score = picks.entry_history?.points ?? 0;
  agg.totalEventPoints += score;
  agg.scoreHistogram.set(score, (agg.scoreHistogram.get(score) ?? 0) + 1);

  if (picks.active_chip) {
    agg.chips[picks.active_chip] = (agg.chips[picks.active_chip] ?? 0) + 1;
  }

  for (const pick of picks.picks) {
    const playerId = pick.element;
    const isBench = pick.position > 11;
    const current = agg.ownership.get(playerId) ?? { starting: 0, bench: 0 };
    if (isBench) {
      current.bench += 1;
    } else {
      current.starting += 1;
    }
    agg.ownership.set(playerId, current);

    if (pick.is_captain) {
      agg.captains.set(playerId, (agg.captains.get(playerId) ?? 0) + 1);
    }
  }

  return agg;
}

export function addTransfers(
  agg: PartialAggregate,
  transfersInId: number | null,
  transfersOutId: number | null
): PartialAggregate {
  if (transfersInId !== null) {
    agg.transfersIn.set(transfersInId, (agg.transfersIn.get(transfersInId) ?? 0) + 1);
  }
  if (transfersOutId !== null) {
    agg.transfersOut.set(transfersOutId, (agg.transfersOut.get(transfersOutId) ?? 0) + 1);
  }
  return agg;
}

const SCORE_BIN_SIZE = 5;

function buildPercentilesFromHistogram(
  sortedEntries: [number, number][],
  total: number
): ScorePercentiles {
  if (total === 0) {
    return { p1: 0, p5: 0, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 };
  }
  function pctAt(p: number): number {
    const target = (p / 100) * total;
    let cum = 0;
    for (const [score, count] of sortedEntries) {
      cum += count;
      if (cum >= target) return score;
    }
    const last = sortedEntries[sortedEntries.length - 1];
    return last ? last[0] : 0;
  }
  return {
    p1: pctAt(1),
    p5: pctAt(5),
    p10: pctAt(10),
    p25: pctAt(25),
    p50: pctAt(50),
    p75: pctAt(75),
    p90: pctAt(90),
    p95: pctAt(95),
    p99: pctAt(99),
  };
}

export function buildScoreDistribution(agg: PartialAggregate): ScoreDistribution | null {
  if (agg.entriesSeen === 0 || agg.scoreHistogram.size === 0) return null;

  const sortedEntries = Array.from(agg.scoreHistogram.entries()).sort(([a], [b]) => a - b);

  const min = sortedEntries[0]?.[0] ?? 0;
  const max = sortedEntries[sortedEntries.length - 1]?.[0] ?? 0;
  const mean = Number((agg.totalEventPoints / agg.entriesSeen).toFixed(2));
  const percentiles = buildPercentilesFromHistogram(sortedEntries, agg.entriesSeen);

  const binMap = new Map<number, number>();
  for (const [score, count] of sortedEntries) {
    const binMin = Math.floor(score / SCORE_BIN_SIZE) * SCORE_BIN_SIZE;
    binMap.set(binMin, (binMap.get(binMin) ?? 0) + count);
  }
  const histogram: ScoreHistogramBin[] = Array.from(binMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([binMin, count]) => ({ min: binMin, max: binMin + SCORE_BIN_SIZE, count }));

  return {
    sampleSize: agg.entriesSeen,
    min,
    max,
    mean,
    median: percentiles.p50,
    percentiles,
    histogram,
  };
}

function mapToSortedArray<T>(
  m: Map<number, T>,
  toEntry: (playerId: number, value: T) => { player_id: number } & Record<string, number>,
  sortKey: string
): Array<{ player_id: number } & Record<string, number>> {
  const out = Array.from(m.entries()).map(([playerId, value]) => toEntry(playerId, value));
  out.sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av !== 'number' || typeof bv !== 'number') return 0;
    return bv - av;
  });
  return out;
}

export function aggregateToPayload(agg: PartialAggregate): CohortSnapshotPayload {
  const captains = mapToSortedArray(
    agg.captains,
    (player_id, count) => ({ player_id, count }),
    'count'
  ) as Array<{ player_id: number; count: number }>;

  const ownership = Array.from(agg.ownership.entries())
    .map(([player_id, value]) => ({
      player_id,
      starting_count: value.starting,
      bench_count: value.bench,
    }))
    .sort((a, b) => b.starting_count - a.starting_count);

  const transfers_in = mapToSortedArray(
    agg.transfersIn,
    (player_id, count) => ({ player_id, count }),
    'count'
  ) as Array<{ player_id: number; count: number }>;

  const transfers_out = mapToSortedArray(
    agg.transfersOut,
    (player_id, count) => ({ player_id, count }),
    'count'
  ) as Array<{ player_id: number; count: number }>;

  const avg_event_points =
    agg.entriesSeen > 0 ? Number((agg.totalEventPoints / agg.entriesSeen).toFixed(2)) : 0;

  const scoreDist = buildScoreDistribution(agg);

  return {
    captains,
    ownership,
    transfers_in,
    transfers_out,
    chips: agg.chips,
    entries_sampled: agg.entriesSeen,
    avg_event_points,
    ...(scoreDist !== null && { score_distribution: scoreDist }),
  };
}

export function payloadToPlayerStatRows(
  payload: CohortSnapshotPayload,
  gw: number,
  tier: CohortTier
): Array<{
  gw: number;
  cohort_tier: CohortTier;
  player_id: number;
  ownership_pct: number;
  captain_pct: number;
  transfers_in_pct: number;
  transfers_out_pct: number;
}> {
  const sampled = payload.entries_sampled;
  if (sampled === 0) return [];

  const captainCount = new Map(payload.captains.map((c) => [c.player_id, c.count]));
  const inCount = new Map(payload.transfers_in.map((c) => [c.player_id, c.count]));
  const outCount = new Map(payload.transfers_out.map((c) => [c.player_id, c.count]));

  return payload.ownership.map((row) => {
    const starting = row.starting_count;
    return {
      gw,
      cohort_tier: tier,
      player_id: row.player_id,
      ownership_pct: Number(((starting / sampled) * 100).toFixed(2)),
      captain_pct: Number((((captainCount.get(row.player_id) ?? 0) / sampled) * 100).toFixed(2)),
      transfers_in_pct: Number((((inCount.get(row.player_id) ?? 0) / sampled) * 100).toFixed(2)),
      transfers_out_pct: Number((((outCount.get(row.player_id) ?? 0) / sampled) * 100).toFixed(2)),
    };
  });
}
