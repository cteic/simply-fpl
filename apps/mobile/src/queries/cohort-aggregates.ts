import {
  type CohortAggregates,
  useCohortAggregates as useSharedCohortAggregates,
} from '@simplyfpl/features/cohorts';

const WORKER_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:8787';

export type { CohortAggregates };

export function useCohortAggregates(gw: number | null): CohortAggregates | undefined {
  return useSharedCohortAggregates({ gw, workerUrl: WORKER_URL }).data;
}
