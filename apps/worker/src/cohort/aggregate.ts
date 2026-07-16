import type { FplEntryGameweekPicks } from '@simplyfpl/types';

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
}

export interface CohortSnapshotPayload {
  captains: Array<{ player_id: number; count: number }>;
  ownership: Array<{ player_id: number; starting_count: number; bench_count: number }>;
  transfers_in: Array<{ player_id: number; count: number }>;
  transfers_out: Array<{ player_id: number; count: number }>;
  chips: Record<string, number>;
  entries_sampled: number;
  avg_event_points: number;
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
  agg.totalEventPoints += picks.entry_history?.points ?? 0;

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

  return {
    captains,
    ownership,
    transfers_in,
    transfers_out,
    chips: agg.chips,
    entries_sampled: agg.entriesSeen,
    avg_event_points,
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
