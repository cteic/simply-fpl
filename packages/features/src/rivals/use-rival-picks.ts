import { useQueries } from '@tanstack/react-query';

import { fplClient } from '@simplyfpl/fpl-client';
import type { FplEntryGameweekPicks } from '@simplyfpl/types';

interface PicksQueryResult {
  status: 'pending' | 'error' | 'success';
  data: FplEntryGameweekPicks | undefined;
  error: unknown;
}

export function partitionResults(
  results: PicksQueryResult[],
  entryIds: number[]
): { data: Map<number, FplEntryGameweekPicks>; errors: Map<number, Error> } {
  const data = new Map<number, FplEntryGameweekPicks>();
  const errors = new Map<number, Error>();

  results.forEach((result, i) => {
    const entryId = entryIds[i];
    if (entryId === undefined) return;
    if (result.status === 'success' && result.data !== undefined) {
      data.set(entryId, result.data);
    } else if (result.status === 'error') {
      errors.set(
        entryId,
        result.error instanceof Error ? result.error : new Error(String(result.error))
      );
    }
  });

  return { data, errors };
}

export function useRivalPicks(
  entryIds: number[],
  gw: number | null
): { data: Map<number, FplEntryGameweekPicks>; isLoading: boolean; errors: Map<number, Error> } {
  const results = useQueries({
    queries: entryIds.map((entryId) => ({
      queryKey: ['entry-picks', entryId, gw],
      queryFn: () => fplClient.getEntryPicks(entryId, gw as number),
      enabled: gw !== null,
      refetchInterval: 60_000,
    })),
  });

  const { data, errors } = partitionResults(results, entryIds);
  const isLoading = results.length > 0 && results.every((r) => r.isLoading);

  return { data, isLoading, errors };
}
