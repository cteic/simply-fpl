import {
  useCohortAggregates as useSharedCohortAggregates,
  type CohortAggregates,
} from '@simplyfpl/features/cohorts';

const WORKER_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:8787';

export type { CohortAggregates };

export function useCohortAggregates(gw: number | null): CohortAggregates | undefined {
  return useSharedCohortAggregates({ gw, workerUrl: WORKER_URL }).data;
}
