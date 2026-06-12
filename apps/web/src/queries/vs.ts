import type { ComparisonSnapshot } from '@simplyfpl/types';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';

export { API_BASE_URL as VS_API_BASE_URL };

export async function fetchVsData(): Promise<ComparisonSnapshot | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/vs/data`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as ComparisonSnapshot;
  } catch {
    return null;
  }
}
