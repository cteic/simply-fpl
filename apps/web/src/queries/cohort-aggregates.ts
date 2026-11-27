'use client';

import {
  useCohortAggregates as useSharedCohortAggregates,
  type UseCohortAggregatesResult,
} from '@simplyfpl/features/cohorts';

export type { CohortAggregates } from '@simplyfpl/features/cohorts';

const WORKER_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';

export function useCohortAggregates(gw: number | null): UseCohortAggregatesResult {
  return useSharedCohortAggregates({ gw, workerUrl: WORKER_URL });
}
