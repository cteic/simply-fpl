import type { ComparisonSnapshot } from '@simplyfpl/types';

import fallbackData from '../data/speed-comparison/fallback.json';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';

export { API_BASE_URL as VS_API_BASE_URL };

const STALE_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000;

function isComparisonSnapshot(value: unknown): value is ComparisonSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  return (
    'measuredAt' in value &&
    typeof value.measuredAt === 'string' &&
    'week' in value &&
    typeof value.week === 'string' &&
    'sites' in value &&
    Array.isArray(value.sites)
  );
}

function isStale(snapshot: ComparisonSnapshot): boolean {
  const age = Date.now() - new Date(snapshot.measuredAt).getTime();
  return age > STALE_THRESHOLD_MS;
}

export interface VsDataResult {
  snapshot: ComparisonSnapshot;
  isFallback: boolean;
}

export async function fetchVsData(): Promise<VsDataResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/vs/data`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const body: unknown = await res.json();
      if (isComparisonSnapshot(body) && !isStale(body)) {
        return { snapshot: body, isFallback: false };
      }
    }
  } catch {
    // fall through to fallback
  }
  const fallback: unknown = fallbackData;
  if (isComparisonSnapshot(fallback)) {
    return { snapshot: fallback, isFallback: true };
  }
  return { snapshot: { measuredAt: '', week: '', sites: [] }, isFallback: true };
}
