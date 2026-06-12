import { useQuery } from '@tanstack/react-query';

import type { CohortAggregates } from './types';

export async function fetchCohortAggregates(
  gw: number,
  workerUrl: string
): Promise<CohortAggregates | null> {
  try {
    const res = await fetch(`${workerUrl}/cohorts/gw${gw}/aggregates.json`);
    if (!res.ok) return null;
    const body = (await res.json()) as unknown;
    if (typeof body !== 'object' || body === null || !('tiers' in body)) return null;
    return { gw, tiers: (body as CohortAggregates).tiers };
  } catch {
    return null;
  }
}

export interface UseCohortAggregatesResult {
  data: CohortAggregates | undefined;
  isLoading: boolean;
  isUnavailable: boolean;
}

interface UseCohortAggregatesArgs {
  gw: number | null;
  workerUrl: string;
}

export function useCohortAggregates({
  gw,
  workerUrl,
}: UseCohortAggregatesArgs): UseCohortAggregatesResult {
  const { data, isFetching, status } = useQuery({
    queryKey: ['cohort-aggregates', gw, workerUrl],
    queryFn: () => (gw === null ? null : fetchCohortAggregates(gw, workerUrl)),
    enabled: gw !== null,
    retry: false,
    staleTime: 60_000,
  });
  return {
    data: data ?? undefined,
    isLoading: isFetching,
    isUnavailable: !isFetching && status === 'success' && data === null,
  };
}
