import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import {
  calculateLivePoints,
  estimateLiveRankSmart,
  fplClient,
  predictBonusPoints,
  resolveFieldLiveAverage,
} from '@simplyfpl/fpl-client';
import type { LiveRankEstimate } from '@simplyfpl/fpl-client';
import type {
  FplBootstrapStatic,
  FplEntry,
  FplEntryGameweekPicks,
  FplFixture,
  FplLiveGameweek,
  RankCurve,
  ScoreDistribution,
} from '@simplyfpl/types';

export interface LiveRankEstimateInput {
  entry: FplEntry;
  picks: FplEntryGameweekPicks;
  bootstrap: FplBootstrapStatic;
  liveGw: FplLiveGameweek;
  fixtures: FplFixture[];
  gw: number;
  /** FPL's own points-to-rank curve, when the worker has one for this GW. */
  curve?: RankCurve | undefined;
  /** A sampled score distribution for the field, if the cohort is running. */
  liveAggregate?: ScoreDistribution | undefined;
  /** Opt into the captured distribution chain. Measured 12x worse than flat. */
  useDistributionModel?: boolean | undefined;
}

/**
 * Single source of truth for the live-rank estimate. Both the nav-bar pill and
 * the live-rank page must derive their figure from this so they never diverge.
 */
export function computeLiveRankEstimate(input: LiveRankEstimateInput): LiveRankEstimate | null {
  const { entry, picks, bootstrap, liveGw, fixtures, gw } = input;
  const preGwRank = entry.summary_overall_rank ?? 0;
  if (preGwRank <= 0) return null;

  // An event stays `is_current` until the next deadline, so the current
  // gameweek is often already finished. Once it is, FPL has folded its points
  // into `summary_overall_rank`, and estimating on top of that counts the same
  // points twice. There is also nothing left to estimate: the real rank is
  // known. Return null so callers show the actual figure instead.
  const event = bootstrap.events.find((e) => e.id === gw);
  if (event?.finished === true) return null;

  const bonusMap = predictBonusPoints(liveGw, fixtures, bootstrap);
  const livePoints = calculateLivePoints(picks, liveGw, bootstrap, bonusMap);

  // FPL reports average_entry_score as 0 until a gameweek settles, and a zero
  // average claims the whole field scored nothing, which credits this manager
  // with their entire score as a gain. Resolve it from the best source going.
  const { average } = resolveFieldLiveAverage({
    event,
    liveGw,
    bootstrap,
    liveAggregate: input.liveAggregate,
  });

  // The curve is keyed on cumulative totals, so it needs where this manager
  // stood before the gameweek, not their rank. A payload without a real total
  // would read as zero and place them last, so the curve only runs when the
  // figure is usable.
  const preGwTotal = picks.entry_history.total_points - picks.entry_history.points;
  const canUseCurve = input.curve !== undefined && preGwTotal > 0;

  return estimateLiveRankSmart(gw, preGwRank, livePoints, average, {
    bootstrap,
    preGwTotal,
    ...(canUseCurve && input.curve !== undefined ? { curve: input.curve } : {}),
    ...(input.liveAggregate === undefined ? {} : { liveAggregate: input.liveAggregate }),
    ...(input.useDistributionModel === undefined
      ? {}
      : { useDistributionModel: input.useDistributionModel }),
  });
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
