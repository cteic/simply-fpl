import { useQuery, useQueryClient } from '@tanstack/react-query';

import { fplClient, getCurrentGameweek } from '@simplyfpl/fpl-client';

const API_BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:8787';

export interface SlimPriceChange {
  id: number;
  web_name: string;
  element_type: number;
  team_name: string;
  now_cost: number;
  ownership: number;
  direction: 'rise' | 'fall';
  probability: number;
}

export interface SlimPricesResponse {
  generated_at: string;
  changes: SlimPriceChange[];
}

function isSlimPricesResponse(value: unknown): value is SlimPricesResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'generated_at' in value &&
    'changes' in value &&
    Array.isArray(value.changes)
  );
}

async function fetchSlimPrices(): Promise<SlimPricesResponse> {
  const res = await fetch(`${API_BASE_URL}/fpl/prices`);
  if (!res.ok) {
    throw new Error(`/fpl/prices ${res.status} ${res.statusText}`);
  }
  const json: unknown = await res.json();
  if (!isSlimPricesResponse(json)) {
    throw new Error('/fpl/prices: unexpected response shape');
  }
  return json;
}

export function usePrices() {
  return useQuery({
    queryKey: ['prices-slim'],
    queryFn: fetchSlimPrices,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

export function useBootstrap() {
  return useQuery({
    queryKey: ['bootstrap'],
    queryFn: () => fplClient.getBootstrapStatic(),
    staleTime: 60 * 60 * 1000,
  });
}

export function useCurrentGameweek(): number | null {
  const { data: bootstrap } = useBootstrap();
  return bootstrap ? getCurrentGameweek(bootstrap) : null;
}

export function useLiveGameweek(eventId: number | null) {
  return useQuery({
    queryKey: ['live-gw', eventId],
    queryFn: () => {
      if (eventId === null) throw new Error('eventId required');
      return fplClient.getLiveGameweek(eventId);
    },
    enabled: eventId !== null,
    refetchInterval: 60_000,
  });
}

export function useEntry(entryId: number | null) {
  return useQuery({
    queryKey: ['entry', entryId],
    queryFn: () => {
      if (entryId === null) throw new Error('entryId required');
      return fplClient.getEntry(entryId);
    },
    enabled: entryId !== null,
    refetchInterval: 60_000,
  });
}

export function useEntryPicks(entryId: number | null, eventId: number | null) {
  return useQuery({
    queryKey: ['entry-picks', entryId, eventId],
    queryFn: () => {
      if (entryId === null || eventId === null) throw new Error('entryId and eventId required');
      return fplClient.getEntryPicks(entryId, eventId);
    },
    enabled: entryId !== null && eventId !== null,
    refetchInterval: 60_000,
  });
}

export function useFixtures(eventId: number | null) {
  return useQuery({
    queryKey: ['fixtures', eventId],
    queryFn: () => fplClient.getFixtures(eventId ?? undefined),
    enabled: eventId !== null,
    staleTime: 5 * 60 * 1000,
  });
}

export function useClassicLeague(leagueId: number | null) {
  return useQuery({
    queryKey: ['classic-league', leagueId],
    queryFn: () => {
      if (leagueId === null) throw new Error('leagueId required');
      return fplClient.getClassicLeague(leagueId);
    },
    enabled: leagueId !== null,
    refetchInterval: 90_000,
  });
}

export function useEntrySnapshot(entryId: number | null) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['entry-snapshot', entryId],
    queryFn: async () => {
      if (entryId === null) throw new Error('entryId required');
      const snapshot = await fplClient.getEntrySnapshot(entryId);
      queryClient.setQueryData(['entry', entryId], snapshot.entry);
      if (snapshot.picks) {
        queryClient.setQueryData(['entry-picks', entryId, snapshot.gw], snapshot.picks);
      }
      return snapshot;
    },
    enabled: entryId !== null,
    staleTime: 60 * 1000,
    refetchInterval: 60_000,
  });
}
