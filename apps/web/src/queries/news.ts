import { useQuery } from '@tanstack/react-query';

import type { EntryNewsResponse, TeamNewsResponse } from '@simplyfpl/types';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';

async function fetchTeamNews(): Promise<TeamNewsResponse> {
  const res = await fetch(`${API_BASE_URL}/news/teams`);
  if (!res.ok) {
    throw new Error(`/news/teams ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as TeamNewsResponse;
}

async function fetchEntryNews(entryId: number): Promise<EntryNewsResponse> {
  const res = await fetch(`${API_BASE_URL}/news/entry/${entryId}`);
  if (!res.ok) {
    throw new Error(`/news/entry/${entryId} ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as EntryNewsResponse;
}

export function useTeamNews() {
  return useQuery({
    queryKey: ['team-news'],
    queryFn: fetchTeamNews,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

export function useEntryNews(entryId: number | null) {
  return useQuery({
    queryKey: ['entry-news', entryId],
    queryFn: () => {
      if (entryId === null) throw new Error('entryId required');
      return fetchEntryNews(entryId);
    },
    enabled: entryId !== null,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}
