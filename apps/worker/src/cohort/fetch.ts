import type { FplEntryGameweekPicks, FplLeague } from '@simplyfpl/types';

const RETRY_DELAY_MS = 1000;
const OVERALL_LEAGUE_ID = 314;

async function fetchWithRetry(url: string, fetcher: typeof fetch): Promise<Response | null> {
  const headers = { 'User-Agent': 'SimplyFPL/1.0', Accept: 'application/json' };
  const first = await fetcher(url, { headers });
  if (first.ok) return first;

  if (first.status === 429 || first.status >= 500) {
    await new Promise<void>((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    const retry = await fetcher(url, { headers });
    return retry.ok ? retry : null;
  }

  return null;
}

export async function fetchTopEntries(
  baseUrl: string,
  cohortSize: number,
  fetcher: typeof fetch
): Promise<number[]> {
  const entryIds: number[] = [];
  let page = 1;

  while (entryIds.length < cohortSize) {
    const url = `${baseUrl}/leagues-classic/${OVERALL_LEAGUE_ID}/standings/?page_standings=${page}`;
    const res = await fetchWithRetry(url, fetcher);
    if (res === null) break;

    const data = (await res.json()) as FplLeague;
    for (const standing of data.standings.results) {
      entryIds.push(standing.entry);
      if (entryIds.length >= cohortSize) break;
    }

    if (!data.standings.has_next || data.standings.results.length === 0) break;
    page++;
  }

  return entryIds;
}

export async function fetchPicksBatch(
  baseUrl: string,
  entryIds: number[],
  gameweek: number,
  fetcher: typeof fetch,
  concurrency = 25
): Promise<Array<{ entryId: number; picks: FplEntryGameweekPicks }>> {
  const results: Array<{ entryId: number; picks: FplEntryGameweekPicks }> = [];

  for (let i = 0; i < entryIds.length; i += concurrency) {
    const batch = entryIds.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map(async (entryId) => {
        const url = `${baseUrl}/entry/${entryId}/event/${gameweek}/picks/`;
        const res = await fetchWithRetry(url, fetcher);
        if (res === null) return null;
        const picks = (await res.json()) as FplEntryGameweekPicks;
        return { entryId, picks };
      })
    );

    for (const outcome of settled) {
      if (outcome.status === 'fulfilled' && outcome.value !== null) {
        results.push(outcome.value);
      }
    }
  }

  return results;
}

export async function fetchRandomEntries(
  baseUrl: string,
  sampleSize: number,
  estimatedTotalPages: number,
  fetcher: typeof fetch
): Promise<number[]> {
  const pagesNeeded = Math.ceil(sampleSize / 50);
  const pageNumbers = Array.from(
    { length: pagesNeeded },
    () => Math.floor(Math.random() * estimatedTotalPages) + 1
  );

  const entryIds: number[] = [];

  for (const page of pageNumbers) {
    if (entryIds.length >= sampleSize) break;
    const url = `${baseUrl}/leagues-classic/${OVERALL_LEAGUE_ID}/standings/?page_standings=${page}`;
    const res = await fetchWithRetry(url, fetcher);
    if (res === null) continue;

    const data = (await res.json()) as FplLeague;
    for (const standing of data.standings.results) {
      entryIds.push(standing.entry);
      if (entryIds.length >= sampleSize) break;
    }
  }

  return entryIds;
}
