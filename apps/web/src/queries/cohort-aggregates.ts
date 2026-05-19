import { useQuery } from '@tanstack/react-query';

const WORKER_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';

export function useCohortAggregatesAvailable(gw: number | null): boolean {
  const { data } = useQuery({
    queryKey: ['cohort-aggregates-availability', gw],
    queryFn: async (): Promise<boolean> => {
      if (gw === null) return false;
      try {
        const res = await fetch(`${WORKER_URL}/cohorts/gw${gw}/aggregates.json`, {
          method: 'HEAD',
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    enabled: gw !== null,
    retry: false,
    staleTime: 60_000,
  });
  return data === true;
}
