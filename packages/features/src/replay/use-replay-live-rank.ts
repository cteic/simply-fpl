import { useMemo } from 'react';

import { calculateLivePoints, estimateLiveRank, predictBonusPoints } from '@simplyfpl/fpl-client';
import type { LiveRankEstimate } from '@simplyfpl/fpl-client';
import type {
  FplBootstrapStatic,
  FplEntrySnapshot,
  FplFixture,
  FplLiveElement,
  FplLiveGameweek,
} from '@simplyfpl/types';

import { gwProgress } from './replay-clock';
import type { ReplayClockState } from './replay-clock';
import type { ReplayBundle, ReplayGameweekFile } from './types';

export interface ReplayLiveRankData {
  snapshot: FplEntrySnapshot | undefined;
  snapshotLoading: boolean;
  snapshotError: boolean;
  liveGw: FplLiveGameweek | undefined;
  fixtures: FplFixture[] | undefined;
  estimate: LiveRankEstimate | null;
  agoMs: number | null;
  isReplay: true;
  replayProgress: number;
  replayLabel: string;
}

/**
 * Linearly interpolate a single live element from "kickoff" (all zeros) to
 * its captured final values at progress 1. Bonus points are only awarded at
 * the end of the GW so we hold them at 0 until the final 10% of the GW.
 */
function interpolateLiveElement(final: FplLiveElement, progress: number): FplLiveElement {
  const bonusVisible = progress >= 0.9;
  return {
    id: final.id,
    stats: {
      minutes: Math.round(final.stats.minutes * progress),
      goals_scored: Math.round(final.stats.goals_scored * progress),
      assists: Math.round(final.stats.assists * progress),
      clean_sheets: progress >= 0.95 ? final.stats.clean_sheets : 0,
      goals_conceded: Math.round(final.stats.goals_conceded * progress),
      yellow_cards: Math.round(final.stats.yellow_cards * progress),
      red_cards: Math.round(final.stats.red_cards * progress),
      saves: Math.round(final.stats.saves * progress),
      bonus: bonusVisible ? final.stats.bonus : 0,
      bps: Math.round(final.stats.bps * progress),
      total_points: Math.round(
        final.stats.total_points * progress + (bonusVisible ? 0 : -final.stats.bonus * progress)
      ),
    },
    explain: final.explain,
  };
}

function interpolateLiveGw(final: FplLiveGameweek, progress: number): FplLiveGameweek {
  if (progress >= 0.999) return final;
  if (progress <= 0) return { elements: [] };
  return {
    elements: final.elements
      .filter((el) => el.stats.minutes > 0 || el.stats.total_points !== 0)
      .map((el) => interpolateLiveElement(el, progress)),
  };
}

function interpolateFixtures(fixtures: FplFixture[], progress: number): FplFixture[] {
  const finished = progress >= 0.95;
  const started = progress > 0.02;
  return fixtures.map((f) => ({
    ...f,
    started: started && (f.started ?? false),
    finished: finished && f.finished,
    finished_provisional: finished && (f.finished_provisional ?? f.finished),
    team_h_score: finished ? f.team_h_score : null,
    team_a_score: finished ? f.team_a_score : null,
  }));
}

export interface BuildReplayInput {
  bundle: ReplayBundle;
  clock: ReplayClockState;
}

interface SyntheticSnapshotInput {
  bundle: ReplayBundle;
  gwFile: ReplayGameweekFile;
  preGwRank: number;
  preGwTotalPoints: number;
  gw: number;
}

function buildSyntheticSnapshot(input: SyntheticSnapshotInput): FplEntrySnapshot {
  const { bundle, gwFile, preGwRank, preGwTotalPoints, gw } = input;
  return {
    bootstrap: bundle.bootstrap,
    entry: {
      ...bundle.manifest.entry,
      summary_overall_rank: preGwRank,
      summary_overall_points: preGwTotalPoints,
      summary_event_points: gwFile.history?.points ?? 0,
      summary_event_rank: null,
    },
    picks: gwFile.picks,
    gw,
    picksAvailable: true,
  };
}

interface PreGwState {
  preGwRank: number;
  preGwTotalPoints: number;
}

/**
 * Look up the pre-gameweek baseline from the manifest's per-GW history
 * snapshot. For GW1 there is no prior row, so we fall back to a 1M default
 * rank (only used until real data arrives).
 */
function preGwState(bundle: ReplayBundle, gw: number): PreGwState {
  if (gw <= 1) {
    return { preGwRank: 1_000_000, preGwTotalPoints: 0 };
  }
  const prior = bundle.manifest.ranksByGw[String(gw - 1)];
  if (!prior) {
    return { preGwRank: 1_000_000, preGwTotalPoints: 0 };
  }
  return { preGwRank: prior.overall_rank, preGwTotalPoints: prior.total_points };
}

export function buildReplayLiveRankData(input: BuildReplayInput): ReplayLiveRankData {
  const { bundle, clock } = input;
  const gwFile = bundle.byGw.get(clock.gw);
  if (!gwFile) {
    return {
      snapshot: undefined,
      snapshotLoading: true,
      snapshotError: false,
      liveGw: undefined,
      fixtures: undefined,
      estimate: null,
      agoMs: null,
      isReplay: true,
      replayProgress: gwProgress(clock),
      replayLabel: `GW${clock.gw}`,
    };
  }

  const progress = gwProgress(clock);
  const { preGwRank, preGwTotalPoints } = preGwState(bundle, clock.gw);

  const snapshot = buildSyntheticSnapshot({
    bundle,
    gwFile,
    preGwRank,
    preGwTotalPoints,
    gw: clock.gw,
  });
  const liveGw = interpolateLiveGw(gwFile.live, progress);
  const fixtures = interpolateFixtures(gwFile.fixtures, progress);

  const bonusMap = predictBonusPoints(liveGw, fixtures, bundle.bootstrap);
  const livePoints = calculateLivePoints(gwFile.picks, liveGw, bundle.bootstrap, bonusMap);
  const avgEntryScore =
    bundle.bootstrap.events.find((e) => e.id === clock.gw)?.average_entry_score ?? 0;
  const estimate: LiveRankEstimate | null =
    preGwRank > 0 ? estimateLiveRank(preGwRank, livePoints, avgEntryScore) : null;

  return {
    snapshot,
    snapshotLoading: false,
    snapshotError: false,
    liveGw,
    fixtures,
    estimate,
    agoMs: 0,
    isReplay: true,
    replayProgress: progress,
    replayLabel: `GW${clock.gw} · ${(progress * 100).toFixed(0)}%`,
  };
}

export interface UseReplayLiveRankInput {
  bundle: ReplayBundle | undefined;
  clock: ReplayClockState;
}

export function useReplayLiveRank(input: UseReplayLiveRankInput): ReplayLiveRankData {
  const bundle = input.bundle;
  const clock = input.clock;
  return useMemo<ReplayLiveRankData>(() => {
    if (!bundle) {
      return {
        snapshot: undefined,
        snapshotLoading: true,
        snapshotError: false,
        liveGw: undefined,
        fixtures: undefined,
        estimate: null,
        agoMs: null,
        isReplay: true,
        replayProgress: gwProgress(clock),
        replayLabel: `GW${clock.gw}`,
      };
    }
    return buildReplayLiveRankData({ bundle, clock });
  }, [bundle, clock]);
}

export { interpolateLiveElement, interpolateLiveGw, interpolateFixtures };

// Re-export the FplBootstrapStatic alias to keep the test surface explicit.
export type ReplayBootstrap = FplBootstrapStatic;
