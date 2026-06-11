import { useQuery } from '@tanstack/react-query';

import type { CohortSnapshotPayload, CohortTier } from '@simplyfpl/features/cohorts';

const WORKER_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:8787';

export interface CohortAggregates {
  gw: number;
  tiers: Partial<Record<CohortTier, CohortSnapshotPayload>>;
}

export function useCohortAggregates(gw: number | null): CohortAggregates | undefined {
  const { data } = useQuery({
    queryKey: ['cohort-aggregates', gw],
    queryFn: async (): Promise<CohortAggregates | null> => {
      if (gw === null) return null;
      const res = await fetch(`${WORKER_URL}/cohorts/gw${gw}/aggregates.json`);
      if (!res.ok) return null;
      const body = (await res.json()) as CohortAggregates;
      if (typeof body !== 'object' || body === null || typeof body.tiers !== 'object') return null;
      return { gw, tiers: body.tiers };
    },
    enabled: gw !== null,
    retry: false,
    staleTime: 60_000,
  });
  return data ?? undefined;
}
