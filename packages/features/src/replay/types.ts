import type {
  FplBootstrapStatic,
  FplEntry,
  FplEntryGameweekPicks,
  FplFixture,
  FplLiveGameweek,
} from '@simplyfpl/types';

export interface ReplayHistoryRow {
  event: number;
  points: number;
  total_points: number;
  overall_rank: number;
  points_on_bench?: number;
  event_transfers?: number;
  event_transfers_cost?: number;
}

export interface ReplayGameweekFile {
  gw: number;
  picks: FplEntryGameweekPicks;
  live: FplLiveGameweek;
  fixtures: FplFixture[];
  history: ReplayHistoryRow | null;
}

export interface ReplayManifestRankRow {
  overall_rank: number;
  total_points: number;
  points: number;
}

export interface ReplayManifest {
  season: string;
  leagueId: number;
  entryId: number;
  entry: FplEntry;
  gameweeks: number[];
  ranksByGw: Record<string, ReplayManifestRankRow>;
  generatedAt: string;
}

export interface ReplayBundle {
  manifest: ReplayManifest;
  bootstrap: FplBootstrapStatic;
  byGw: Map<number, ReplayGameweekFile>;
}

export type ReplaySpeed = 1 | 4 | 16 | 60;

export const REPLAY_SPEEDS: readonly ReplaySpeed[] = [1, 4, 16, 60] as const;

export const DEFAULT_GW_DURATION_MS = 60_000;
