import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import {
  calculateLivePoints,
  estimateLiveRankSmart,
  fplClient,
  predictBonusPoints,
} from '@simplyfpl/fpl-client';
import type { LiveRankEstimate } from '@simplyfpl/fpl-client';
import type {
  FplBootstrapStatic,
  FplEntry,
  FplEntryGameweekPicks,
  FplFixture,
  FplLiveGameweek,
} from '@simplyfpl/types';

export interface LiveRankEstimateInput {
  entry: FplEntry;
  picks: FplEntryGameweekPicks;
  bootstrap: FplBootstrapStatic;
  liveGw: FplLiveGameweek;
  fixtures: FplFixture[];
  gw: number;
}

/**
 * Single source of truth for the live-rank estimate. Both the nav-bar pill and
 * the live-rank page must derive their figure from this so they never diverge.
 */
export function computeLiveRankEstimate(input: LiveRankEstimateInput): LiveRankEstimate | null {
  const { entry, picks, bootstrap, liveGw, fixtures, gw } = input;
  const preGwRank = entry.summary_overall_rank ?? 0;
  if (preGwRank <= 0) return null;
  const bonusMap = predictBonusPoints(liveGw, fixtures, bootstrap);
  const livePoints = calculateLivePoints(picks, liveGw, bootstrap, bonusMap);
  const avgEntryScore = bootstrap.events.find((e) => e.id === gw)?.average_entry_score ?? 0;
  return estimateLiveRankSmart(gw, preGwRank, livePoints, avgEntryScore);
}

export interface UseLiveRankEstimateResult {
  estimate: LiveRankEstimate | null;
}

export function useLiveRankEstimate(entryId: number | null): UseLiveRankEstimateResult {
  const snapshotQuery = useQuery({
    queryKey: ['entry-snapshot', entryId],
    queryFn: () => {
      if (entryId === null) throw new Error('entryId required');
      return fplClient.getEntrySnapshot(entryId);
    },
    enabled: entryId !== null,
    staleTime: 60 * 1000,
    refetchInterval: 60_000,
  });

  const snapshot = snapshotQuery.data;
  const gw = snapshot?.gw ?? null;

  const liveQuery = useQuery({
    queryKey: ['live-gw', gw],
    queryFn: () => {
      if (gw === null) throw new Error('gw required');
      return fplClient.getLiveGameweek(gw);
    },
    enabled: gw !== null,
    refetchInterval: 60_000,
  });

  const fixturesQuery = useQuery({
    queryKey: ['fixtures', gw],
    queryFn: () => fplClient.getFixtures(gw ?? undefined),
    enabled: gw !== null,
    staleTime: 5 * 60 * 1000,
  });

  const liveGw = liveQuery.data;
  const fixtures = fixturesQuery.data;

  const estimate = useMemo(() => {
    if (!snapshot || !snapshot.picks || gw === null || !liveGw) return null;
    return computeLiveRankEstimate({
      entry: snapshot.entry,
      picks: snapshot.picks,
      bootstrap: snapshot.bootstrap,
      liveGw,
      fixtures: fixtures ?? [],
      gw,
    });
  }, [snapshot, gw, liveGw, fixtures]);

  return { estimate };
}
