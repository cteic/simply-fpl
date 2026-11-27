import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplFixture,
  FplLiveGameweek,
} from '@simplyfpl/types';

import type { CohortSnapshotPayload } from '../cohorts/types';
import { computeThreats, type Threat } from './compute-threats';

/** Where the ownership figures behind a threat list came from. */
export type ThreatSource = 'top_10k' | 'field';

/** Nominal sample size the field cohort is scaled to. */
const FIELD_SCALE = 10_000;

/** Below this overall ownership a player is nobody's threat. */
export const FIELD_MIN_OWNERSHIP_PCT = 3;

/**
 * An ownership cohort built from FPL's own overall ownership.
 *
 * Used when the sampled top-10k cohort is unavailable. It is real data for the
 * whole game rather than a sample of strong managers, with two limits the
 * caller should state: `selected_by_percent` counts squads, not starting
 * elevens, and FPL publishes no per-player captaincy, so effective ownership
 * here is plain ownership and understates the most-captained players.
 */
export function buildFieldCohort(bootstrap: FplBootstrapStatic, gw: number): CohortSnapshotPayload {
  const ownership: CohortSnapshotPayload['ownership'] = [];
  for (const player of bootstrap.elements) {
    const pct = Number.parseFloat(player.selected_by_percent);
    if (!Number.isFinite(pct) || pct < FIELD_MIN_OWNERSHIP_PCT) continue;
    ownership.push({
      player_id: player.id,
      starting_count: Math.round((pct / 100) * FIELD_SCALE),
      bench_count: 0,
    });
  }
  const event = bootstrap.events.find((e) => e.id === gw);
  return {
    captains: [],
    ownership,
    transfers_in: [],
    transfers_out: [],
    chips: {},
    entries_sampled: FIELD_SCALE,
    avg_event_points: event?.average_entry_score ?? 0,
  };
}

export interface ResolveThreatsArgs {
  yourPicks: FplEntryGameweekPicks;
  /** The sampled top-10k cohort, when the worker has one for this gameweek. */
  cohort?: CohortSnapshotPayload | undefined;
  bootstrap: FplBootstrapStatic;
  liveGw: FplLiveGameweek;
  fixtures: FplFixture[];
  gw: number;
  nowMs?: number;
}

export interface ResolvedThreats {
  threats: Threat[];
  source: ThreatSource;
}

/**
 * The players most likely to cost this manager rank, from the best ownership
 * data available: the sampled top-10k cohort if there is one, otherwise the
 * whole field. Never placeholder rows: a list that cannot be computed is empty.
 */
export function resolveThreats(args: ResolveThreatsArgs): ResolvedThreats {
  const hasCohort = args.cohort !== undefined && args.cohort.entries_sampled > 0;
  const cohort = hasCohort && args.cohort ? args.cohort : buildFieldCohort(args.bootstrap, args.gw);
  const threats = computeThreats({
    yourPicks: args.yourPicks,
    cohort,
    bootstrap: args.bootstrap,
    liveGw: args.liveGw,
    fixtures: args.fixtures,
    ...(args.nowMs === undefined ? {} : { nowMs: args.nowMs }),
  });
  return { threats, source: hasCohort ? 'top_10k' : 'field' };
}
