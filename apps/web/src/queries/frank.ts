import type { SupabaseClient } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';

import { quotaWindowStart } from '@simplyfpl/features/frank';
import type { FrankQuota as FrankAllowance } from '@simplyfpl/features/frank';
import type { Database, FrankWeeklyPayload } from '@simplyfpl/types';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';

async function fetchFrankWeekly(): Promise<FrankWeeklyPayload> {
  const res = await fetch(`${API_BASE_URL}/frank/weekly`);
  if (!res.ok) {
    throw new Error(`/frank/weekly ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as FrankWeeklyPayload;
}

export function useFrankWeekly() {
  return useQuery({
    queryKey: ['frank-weekly'],
    queryFn: fetchFrankWeekly,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}

export interface FrankQuota {
  used: number;
  softCap: number;
  hardCap: number;
}

async function fetchFrankQuota(
  client: SupabaseClient<Database>,
  userId: string,
  allowance: FrankAllowance
): Promise<FrankQuota> {
  // Counted over the same window the route enforces: a week for free users, a
  // month for paying ones. Counting a month here against a weekly limit there
  // would show a free user as over their allowance on the eighth of the month.
  const windowStart = quotaWindowStart(allowance.period);

  const { count } = await client
    .from('frank_queries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', windowStart.toISOString());

  return { used: count ?? 0, softCap: allowance.soft, hardCap: allowance.hard };
}

export function useFrankQuota(
  client: SupabaseClient<Database>,
  userId: string | null,
  allowance: FrankAllowance | null
) {
  return useQuery({
    queryKey: ['frank-quota', userId, allowance?.period ?? null, allowance?.hard ?? null],
    queryFn: () => {
      if (!userId) throw new Error('userId is required');
      if (!allowance) throw new Error('allowance is required');
      return fetchFrankQuota(client, userId, allowance);
    },
    enabled: userId !== null && allowance !== null,
    staleTime: 30 * 1000,
  });
}

export type FrankQueryRow = Database['public']['Tables']['frank_queries']['Row'];

async function fetchFrankHistory(
  client: SupabaseClient<Database>,
  userId: string
): Promise<FrankQueryRow[]> {
  const { data } = await client
    .from('frank_queries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  return data ?? [];
}

export function useFrankHistory(client: SupabaseClient<Database>, userId: string | null) {
  return useQuery({
    queryKey: ['frank-history', userId],
    queryFn: () => {
      if (!userId) throw new Error('userId is required');
      return fetchFrankHistory(client, userId);
    },
    enabled: userId !== null,
    staleTime: 30 * 1000,
  });
}
