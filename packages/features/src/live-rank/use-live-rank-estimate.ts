import { useQuery } from '@tanstack/react-query';

import {
  applyAutosubs,
  calculateLivePoints,
  computeRankTargets,
  estimateLiveRankSmart,
  fplClient,
  predictBonusPoints,
  resolveFieldLiveAverage,
  seasonHighestGwScore,
} from '@simplyfpl/fpl-client';
import type { LiveRankEstimate } from '@simplyfpl/fpl-client';
import type {
  FplBootstrapStatic,
  FplEntry,
  FplEntryGameweekPicks,
  FplFixture,
  FplLiveGameweek,
  RankCurve,
  RankTargets,
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

interface LiveRankInputs {
  preGwRank: number;
  preGwTotal: number;
  livePoints: number;
  /** Live points once automatic substitutions are applied. */
  postSubsPoints: number;
  fieldLiveAverage: number;
}

/**
 * The figures every live-rank view is built from.
 *
 * The estimate and the targets both read this, so a target can never disagree
 * with the rank shown next to it.
 */
function deriveLiveRankInputs(input: LiveRankEstimateInput): LiveRankInputs | null {
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
  const postSubsPoints = calculateLivePoints(
    applyAutosubs(picks, liveGw, bootstrap),
    liveGw,
    bootstrap,
    bonusMap
  );

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
  // stood before the gameweek, not their rank.
  const preGwTotal = picks.entry_history.total_points - picks.entry_history.points;

  return { preGwRank, preGwTotal, livePoints, postSubsPoints, fieldLiveAverage: average };
}

/**
 * What the manager needs to score to reach each milestone rank, and what keeps
 * them where they are.
 *
 * Needs the curve: without FPL's own points-to-rank mapping there is nothing to
 * invert, and a made-up slope gives a target that is simply wrong. Returns null
 * rather than a guess.
 */
export function computeLiveRankTargets(input: LiveRankEstimateInput): RankTargets | null {
  if (!input.curve) return null;
  const derived = deriveLiveRankInputs(input);
  if (!derived) return null;
  return computeRankTargets({
    curve: input.curve,
    gw: input.gw,
    preGwTotal: derived.preGwTotal,
    livePoints: derived.livePoints,
    fieldLiveAverage: derived.fieldLiveAverage,
    preGwRank: derived.preGwRank,
    // What someone has actually scored this season, not a guessed ceiling.
    maxReachableGwPoints: seasonHighestGwScore(input.bootstrap),
  });
}

/**
 * Single source of truth for the live-rank estimate. Both the nav-bar pill and
 * the live-rank page must derive their figure from this so they never diverge.
 */
export function computeLiveRankEstimate(input: LiveRankEstimateInput): LiveRankEstimate | null {
  const derived = deriveLiveRankInputs(input);
  if (!derived) return null;
  return estimateFor(input, derived, derived.livePoints);
}

/**
 * The same estimate with automatic substitutions applied.
 *
 * Runs through the identical path as the headline figure. It used to be worked
 * out separately with the flat model and FPL's raw average, which is zero
 * until a gameweek settles, so the pre-subs and post-subs ranks on one screen
 * came from two different models and could not be compared.
 */
export function computePostSubsRankEstimate(input: LiveRankEstimateInput): LiveRankEstimate | null {
  const derived = deriveLiveRankInputs(input);
  if (!derived) return null;
  return estimateFor(input, derived, derived.postSubsPoints);
}

function estimateFor(
  input: LiveRankEstimateInput,
  derived: LiveRankInputs,
  points: number
): LiveRankEstimate {
  // A payload without a real pre-gameweek total would read as zero and place
  // the manager last, so the curve only runs when the figure is usable.
  const canUseCurve = input.curve !== undefined && derived.preGwTotal > 0;

  return estimateLiveRankSmart(input.gw, derived.preGwRank, points, derived.fieldLiveAverage, {
    bootstrap: input.bootstrap,
    preGwTotal: derived.preGwTotal,
    ...(canUseCurve && input.curve !== undefined ? { curve: input.curve } : {}),
    ...(input.liveAggregate === undefined ? {} : { liveAggregate: input.liveAggregate }),
    ...(input.useDistributionModel === undefined
      ? {}
      : { useDistributionModel: input.useDistributionModel }),
  });
}

export interface UseLiveRankEstimateResult {
  estimate: LiveRankEstimate | null;
  /** The estimate after automatic substitutions. Null once the gameweek settles. */
  postSubsEstimate: LiveRankEstimate | null;
  /** Null until the curve has loaded: a target cannot be guessed without it. */
  targets: RankTargets | null;
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

  // Settled data: it only changes when a gameweek is checked, so it is fetched
  // once and reused for every refresh of the live figures.
  const curveQuery = useQuery({
    queryKey: ['rank-curve'],
    queryFn: () => fplClient.getRankCurve(),
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  });

  const liveGw = liveQuery.data;
  const fixtures = fixturesQuery.data;
  const curve = curveQuery.data;

  const viewInput =
    !snapshot || !snapshot.picks || gw === null || !liveGw
      ? null
      : {
          entry: snapshot.entry,
          picks: snapshot.picks,
          bootstrap: snapshot.bootstrap,
          liveGw,
          fixtures: fixtures ?? [],
          gw,
          curve,
        };

  const estimate = viewInput === null ? null : computeLiveRankEstimate(viewInput);

  const postSubsEstimate = viewInput === null ? null : computePostSubsRankEstimate(viewInput);

  const targets = viewInput === null ? null : computeLiveRankTargets(viewInput);

  return { estimate, postSubsEstimate, targets };
}
