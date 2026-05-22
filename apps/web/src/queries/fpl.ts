import { useQuery, useQueryClient } from '@tanstack/react-query';

import { fplClient } from '@simplyfpl/fpl-client';
import { getCurrentGameweek } from '@simplyfpl/fpl-client';
import type { FplBootstrapStatic } from '@simplyfpl/types';

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

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';

async function fetchSlimPrices(): Promise<SlimPricesResponse> {
  const res = await fetch(`${API_BASE_URL}/fpl/prices`);
  if (!res.ok) {
    throw new Error(`/fpl/prices ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as SlimPricesResponse;
}

export function usePrices() {
  return useQuery({
    queryKey: ['prices-slim'],
    queryFn: fetchSlimPrices,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

const BOOTSTRAP_CACHE_KEY = 'simplyfpl:bootstrap-cache';

interface BootstrapCacheEntry {
  data: FplBootstrapStatic;
  savedAt: number;
}

function isBootstrap(value: unknown): value is FplBootstrapStatic {
  return (
    typeof value === 'object' &&
    value !== null &&
    'events' in value &&
    Array.isArray(value.events) &&
    'elements' in value &&
    Array.isArray(value.elements) &&
    'teams' in value &&
    Array.isArray(value.teams)
  );
}

function readBootstrapCache(): BootstrapCacheEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(BOOTSTRAP_CACHE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'savedAt' in parsed &&
      typeof parsed.savedAt === 'number' &&
      'data' in parsed &&
      isBootstrap(parsed.data)
    ) {
      return { data: parsed.data, savedAt: parsed.savedAt };
    }
    return null;
  } catch {
    return null;
  }
}

function writeBootstrapCache(data: FplBootstrapStatic): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: BootstrapCacheEntry = { data, savedAt: Date.now() };
    window.localStorage.setItem(BOOTSTRAP_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage may be unavailable or full — the fallback is best-effort.
  }
}

async function fetchBootstrap(): Promise<FplBootstrapStatic> {
  const data = await fplClient.getBootstrapStatic();
  writeBootstrapCache(data);
  return data;
}

export function useBootstrap() {
  return useQuery({
    queryKey: ['bootstrap'],
    queryFn: fetchBootstrap,
    staleTime: 60 * 60 * 1000, // 1 hour
    initialData: () => readBootstrapCache()?.data,
    initialDataUpdatedAt: () => readBootstrapCache()?.savedAt,
  });
}

export interface BootstrapStatus {
  isStale: boolean;
}

export function useBootstrapStatus(): BootstrapStatus {
  const { data, dataUpdatedAt, errorUpdatedAt } = useBootstrap();
  const isStale = data !== undefined && errorUpdatedAt > dataUpdatedAt;
  return { isStale };
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

export function useEntryPicks(entryId: number, eventId: number | null) {
  return useQuery({
    queryKey: ['entry-picks', entryId, eventId],
    queryFn: () => {
      if (eventId === null) throw new Error('eventId required');
      return fplClient.getEntryPicks(entryId, eventId);
    },
    enabled: eventId !== null,
    refetchInterval: 60_000,
  });
}

export function useCurrentGameweek() {
  const { data: bootstrap } = useBootstrap();
  return bootstrap ? getCurrentGameweek(bootstrap) : null;
}

export function useClassicLeague(leagueId: number) {
  return useQuery({
    queryKey: ['classic-league', leagueId],
    queryFn: () => fplClient.getClassicLeague(leagueId),
    refetchInterval: 90_000,
  });
}

export function useFixtures(eventId: number | null) {
  return useQuery({
    queryKey: ['fixtures', eventId],
    queryFn: () => fplClient.getFixtures(eventId ?? undefined),
    staleTime: 5 * 60 * 1000,
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
