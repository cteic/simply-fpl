export type CohortTier = 'top_10k' | 'top_100k' | 'overall' | 'legendary';

export interface CohortPlayerStats {
  gw: number;
  cohort_tier: CohortTier;
  player_id: number;
  ownership_pct: number;
  captain_pct: number;
  transfers_in_pct: number;
  transfers_out_pct: number;
  updated_at: string;
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

export interface CohortAggregates {
  gw: number;
  tiers: Partial<Record<CohortTier, CohortSnapshotPayload>>;
}
