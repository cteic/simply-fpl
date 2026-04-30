/**
 * Live rank computation.
 *
 * The differentiating feature vs livefpl.net: faster, more accurate live
 * overall rank that accounts for:
 *   - Provisional bonus points (BPS) before FPL confirms
 *   - Auto-substitutions (livefpl applies these hours late)
 *   - Captain/triple captain multipliers
 *   - Active chips (Bench Boost, Free Hit, Wildcard, Triple Captain, Manager)
 *
 * The FPL API itself doesn't expose a "live rank" — we estimate it by
 * comparing the manager's live points to a sampled distribution from the
 * top-N managers we cache in KV. See `infra/worker/rank-sampler.ts`.
 *
 * TODO: implement once we have:
 *   - bonus point calculator from BPS
 *   - autosub simulator
 *   - rank distribution sampler
 */
import type { FplBootstrapStatic, FplEntryGameweekPicks, FplLiveGameweek } from '@simplyfpl/types';

export interface AutoSub {
  entry: number;
  element_in: number;
  element_out: number;
  event: number;
}

export interface LiveRankInput {
  entryId: number;
  eventId: number;
  picks: FplEntryGameweekPicks;
  live: FplLiveGameweek;
  bootstrap: FplBootstrapStatic;
  /** Sampled rank distribution for this gameweek. Provided by Worker. */
  rankDistribution: RankDistribution;
}

export interface RankDistribution {
  /** Map of points-scored → estimated overall rank at that score. */
  pointsToRank: Map<number, number>;
  /** Total managers entered in the gameweek. */
  totalEntries: number;
}

export interface LiveRankResult {
  /** Estimated current overall rank. */
  overallRank: number;
  /** Rank delta since gameweek started (negative = climbed up). */
  rankDelta: number;
  /** Live gameweek points (XI + bench if BB active + bonus). */
  livePoints: number;
  /** Breakdown for UI. */
  breakdown: {
    startingXi: number;
    bonus: number;
    autosubs: number;
    captainMultiplier: number;
  };
  /** Players yet to play this gameweek. */
  yetToPlay: number;
  /** Suggested auto-subs based on current minutes data. */
  projectedAutoSubs: AutoSub[];
}

/**
 * Compute live rank from current FPL state.
 *
 * @param input — combined picks + live data + bootstrap + sampled distribution
 * @returns live rank result with full breakdown
 */
export function computeLiveRank(_input: LiveRankInput): LiveRankResult {
  // TODO: implement
  throw new Error('computeLiveRank not yet implemented');
}
