import { useQueries, useQuery } from '@tanstack/react-query';

import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplFixture,
  FplLiveGameweek,
} from '@simplyfpl/types';

import type { ReplayGameweekFile, ReplayManifest } from './types';

const DEFAULT_BASE_PATH = '/replay/2025-26';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`replay fetch ${res.status} ${res.statusText} — ${url}`);
  }
  return (await res.json()) as T;
}

export interface UseReplayManifestResult {
  manifest: ReplayManifest | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function useReplayManifest(basePath: string = DEFAULT_BASE_PATH): UseReplayManifestResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['replay-manifest', basePath],
    queryFn: () => fetchJson<ReplayManifest>(`${basePath}/manifest.json`),
    staleTime: Infinity,
  });
  return { manifest: data, isLoading, error: error as Error | null };
}

export interface UseReplayBootstrapResult {
  bootstrap: FplBootstrapStatic | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function useReplayBootstrap(basePath: string = DEFAULT_BASE_PATH): UseReplayBootstrapResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['replay-bootstrap', basePath],
    queryFn: () => fetchJson<FplBootstrapStatic>(`${basePath}/bootstrap.json`),
    staleTime: Infinity,
  });
  return { bootstrap: data, isLoading, error: error as Error | null };
}

export interface UseReplayGameweeksResult {
  byGw: Map<number, ReplayGameweekFile>;
  loadedCount: number;
  totalCount: number;
}

interface RawReplayGameweekPayload {
  gw: number;
  picks: FplEntryGameweekPicks;
  live: FplLiveGameweek;
  fixtures: FplFixture[];
  history: ReplayGameweekFile['history'];
}

/**
 * Eagerly fetch every per-GW file declared in the manifest. The bundle is
 * small enough (~7MB uncompressed for a full season) that pre-loading gives
 * a far better demo experience than lazy loading mid-playback.
 */
export function useReplayGameweeks(
  gws: number[] | undefined,
  basePath: string = DEFAULT_BASE_PATH
): UseReplayGameweeksResult {
  const list = gws ?? [];
  const results = useQueries({
    queries: list.map((gw) => ({
      queryKey: ['replay-gw', basePath, gw],
      queryFn: () => fetchJson<RawReplayGameweekPayload>(`${basePath}/gw${gw}.json`),
      staleTime: Infinity,
    })),
  });

  const byGw = new Map<number, ReplayGameweekFile>();
  let loadedCount = 0;
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const gw = list[i];
    if (gw === undefined) continue;
    if (result && result.data) {
      byGw.set(gw, result.data);
      loadedCount += 1;
    }
  }
  return { byGw, loadedCount, totalCount: list.length };
}
