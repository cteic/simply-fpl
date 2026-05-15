import type { SupabaseClient } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';

import type { Database } from '@simplyfpl/types';

import type { CohortPlayerStats, CohortTier } from './types';

interface UseCohortBenchmarkArgs {
  client: SupabaseClient<Database>;
  gw: number | null;
  tier: CohortTier;
  playerId: number;
  staleTimeMs?: number;
}

export interface UseCohortBenchmarkResult {
  data: CohortPlayerStats | undefined;
  isLoading: boolean;
  isError: boolean;
}

const DEFAULT_STALE_TIME_MS = 10 * 60 * 1000;

export function useCohortBenchmark({
  client,
  gw,
  tier,
  playerId,
  staleTimeMs = DEFAULT_STALE_TIME_MS,
}: UseCohortBenchmarkArgs): UseCohortBenchmarkResult {
  const query = useQuery({
    queryKey: ['cohort-benchmark', gw, tier, playerId],
    queryFn: async (): Promise<CohortPlayerStats | undefined> => {
      if (gw === null) return undefined;
      const { data, error } = await client
        .from('cohort_player_stats')
        .select('*')
        .eq('gw', gw)
        .eq('cohort_tier', tier)
        .eq('player_id', playerId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return undefined;
      return data as unknown as CohortPlayerStats;
    },
    enabled: gw !== null,
    staleTime: staleTimeMs,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
