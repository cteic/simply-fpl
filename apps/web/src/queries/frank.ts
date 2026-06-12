import type { SupabaseClient } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';

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
  userId: string
): Promise<FrankQuota> {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const { count } = await client
    .from('frank_queries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString());

  return { used: count ?? 0, softCap: 50, hardCap: 80 };
}

export function useFrankQuota(client: SupabaseClient<Database>, userId: string | null) {
  return useQuery({
    queryKey: ['frank-quota', userId],
    queryFn: () => {
      if (!userId) throw new Error('userId is required');
      return fetchFrankQuota(client, userId);
    },
    enabled: userId !== null,
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
