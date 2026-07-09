import { useQuery } from '@tanstack/react-query';

import { frank } from '@simplyfpl/features';
import type { FrankWeeklyPayload } from '@simplyfpl/types';

const API_BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:8787';

async function fetchFrankWeekly(): Promise<FrankWeeklyPayload> {
  const res = await fetch(`${API_BASE_URL}/frank/weekly`);
  if (!res.ok) throw new Error(`/frank/weekly ${res.status} ${res.statusText}`);
  const json: unknown = await res.json();
  if (!frank.isFrankWeeklyPayload(json)) throw new Error('/frank/weekly: unexpected shape');
  return json;
}

export function useFrankWeekly() {
  return useQuery({
    queryKey: ['frank-weekly'],
    queryFn: fetchFrankWeekly,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}
