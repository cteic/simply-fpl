import type { FplEntryGameweekPicks, FplLeague } from '@simplyfpl/types';

import {
  type CohortTier,
  type PartialAggregate,
  addTransfers,
  emptyAggregate,
  mergePicks,
} from './aggregate';

export interface TierConfig {
  slug: CohortTier;
  pagesToFetch: number;
  budgetPerTick: number;
}

export const TIER_CONFIGS: Record<CohortTier, TierConfig> = {
  legendary: { slug: 'legendary', pagesToFetch: 20, budgetPerTick: 30 },
  top_10k: { slug: 'top_10k', pagesToFetch: 30, budgetPerTick: 150 },
  top_100k: { slug: 'top_100k', pagesToFetch: 60, budgetPerTick: 150 },
  overall: { slug: 'overall', pagesToFetch: 40, budgetPerTick: 150 },
};

const GLOBAL_LEAGUE_ID = 314;
const FPL_BASE = 'https://fantasy.premierleague.com/api';
const REQUEST_GAP_MS = 1000;

export interface Cursor {
  page: number;
  entryIndexInPage: number;
}

export interface FetchTierEnv {
  FPL_CACHE: KVNamespace;
  COHORT_LOCK: DurableObjectNamespace;
}

interface ResumeResult {
  done: boolean;
  fetched: number;
  paused: boolean;
}

function cursorKey(gw: number, tier: CohortTier): string {
  return `cohort:cursor:${gw}:${tier}`;
}

function aggregateKey(gw: number, tier: CohortTier): string {
  return `cohort:agg:${gw}:${tier}`;
}

function lockKey(gw: number, tier: CohortTier): string {
  return `cohort:lock:${gw}:${tier}`;
}

function pauseKey(): string {
  return `cohort:pause:fpl`;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchStandings(leagueId: number, page: number): Promise<FplLeague | null> {
  const url = `${FPL_BASE}/leagues-classic/${leagueId}/standings/?page_standings=${page}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SimplyFPL/1.0', Accept: 'application/json' },
  });
  if (!res.ok) return null;
  return (await res.json()) as FplLeague;
}

async function fetchEntryPicks(entryId: number, gw: number): Promise<FplEntryGameweekPicks | null> {
  const url = `${FPL_BASE}/entry/${entryId}/event/${gw}/picks/`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SimplyFPL/1.0', Accept: 'application/json' },
  });
  if (!res.ok) return null;
  return (await res.json()) as FplEntryGameweekPicks;
}

async function readCursor(env: FetchTierEnv, gw: number, tier: CohortTier): Promise<Cursor> {
  const raw = await env.FPL_CACHE.get(cursorKey(gw, tier), 'json');
  if (raw && typeof raw === 'object' && raw !== null) {
    const c = raw as { page?: unknown; entryIndexInPage?: unknown };
    if (typeof c.page === 'number' && typeof c.entryIndexInPage === 'number') {
      return { page: c.page, entryIndexInPage: c.entryIndexInPage };
    }
  }
  return { page: 1, entryIndexInPage: 0 };
}

async function writeCursor(
  env: FetchTierEnv,
  gw: number,
  tier: CohortTier,
  cursor: Cursor
): Promise<void> {
  await env.FPL_CACHE.put(cursorKey(gw, tier), JSON.stringify(cursor), {
    expirationTtl: 60 * 60 * 24 * 7,
  });
}

export async function readAggregate(
  env: FetchTierEnv,
  gw: number,
  tier: CohortTier
): Promise<PartialAggregate> {
  const raw = await env.FPL_CACHE.get(aggregateKey(gw, tier), 'json');
  if (!raw) return emptyAggregate();
  return rehydrateAggregate(raw);
}

function rehydrateAggregate(raw: unknown): PartialAggregate {
  const agg = emptyAggregate();
  if (typeof raw !== 'object' || raw === null) return agg;
  const r = raw as Record<string, unknown>;

  if (Array.isArray(r['captains'])) {
    for (const entry of r['captains']) {
      if (Array.isArray(entry) && typeof entry[0] === 'number' && typeof entry[1] === 'number') {
        agg.captains.set(entry[0], entry[1]);
      }
    }
  }
  if (Array.isArray(r['ownership'])) {
    for (const entry of r['ownership']) {
      if (
        Array.isArray(entry) &&
        typeof entry[0] === 'number' &&
        entry[1] &&
        typeof entry[1] === 'object'
      ) {
        const v = entry[1] as { starting?: unknown; bench?: unknown };
        if (typeof v.starting === 'number' && typeof v.bench === 'number') {
          agg.ownership.set(entry[0], { starting: v.starting, bench: v.bench });
        }
      }
    }
  }
  if (typeof r['entriesSeen'] === 'number') agg.entriesSeen = r['entriesSeen'];
  if (typeof r['totalEventPoints'] === 'number') agg.totalEventPoints = r['totalEventPoints'];
  if (r['chips'] && typeof r['chips'] === 'object') {
    agg.chips = r['chips'] as Record<string, number>;
  }
  if (Array.isArray(r['seenEntryIds'])) {
    for (const id of r['seenEntryIds']) {
      if (typeof id === 'number') agg.seenEntryIds.add(id);
    }
  }
  return agg;
}

function serialiseAggregate(agg: PartialAggregate): string {
  return JSON.stringify({
    captains: Array.from(agg.captains.entries()),
    ownership: Array.from(agg.ownership.entries()),
    transfersIn: Array.from(agg.transfersIn.entries()),
    transfersOut: Array.from(agg.transfersOut.entries()),
    chips: agg.chips,
    entriesSeen: agg.entriesSeen,
    totalEventPoints: agg.totalEventPoints,
    seenEntryIds: Array.from(agg.seenEntryIds),
  });
}

async function writeAggregate(
  env: FetchTierEnv,
  gw: number,
  tier: CohortTier,
  agg: PartialAggregate
): Promise<void> {
  await env.FPL_CACHE.put(aggregateKey(gw, tier), serialiseAggregate(agg), {
    expirationTtl: 60 * 60 * 24 * 7,
  });
}

const LOCK_TTL_SECS = 300;

async function acquireLock(env: FetchTierEnv, gw: number, tier: CohortTier): Promise<boolean> {
  const stub = env.COHORT_LOCK.get(env.COHORT_LOCK.idFromName(lockKey(gw, tier)));
  const res = await stub.fetch(`https://cohort-lock/acquire?ttl=${LOCK_TTL_SECS}`);
  return res.status === 200;
}

async function releaseLock(env: FetchTierEnv, gw: number, tier: CohortTier): Promise<void> {
  const stub = env.COHORT_LOCK.get(env.COHORT_LOCK.idFromName(lockKey(gw, tier)));
  await stub.fetch('https://cohort-lock/release');
}

async function isPaused(env: FetchTierEnv): Promise<boolean> {
  return (await env.FPL_CACHE.get(pauseKey())) !== null;
}

async function pauseFetcher(env: FetchTierEnv, seconds: number): Promise<void> {
  await env.FPL_CACHE.put(pauseKey(), '1', { expirationTtl: seconds });
}

export async function resumeCohortFetch(
  env: FetchTierEnv,
  gw: number,
  tier: TierConfig
): Promise<ResumeResult> {
  if (await isPaused(env)) {
    return { done: false, fetched: 0, paused: true };
  }
  if (!(await acquireLock(env, gw, tier.slug))) {
    return { done: false, fetched: 0, paused: false };
  }

  let fetched = 0;
  try {
    const cursor = await readCursor(env, gw, tier.slug);
    const agg = await readAggregate(env, gw, tier.slug);

    let { page, entryIndexInPage } = cursor;
    while (fetched < tier.budgetPerTick && page <= tier.pagesToFetch) {
      const standings = await fetchStandings(GLOBAL_LEAGUE_ID, page);
      fetched += 1;
      if (!standings) {
        await pauseFetcher(env, 300);
        break;
      }
      await sleep(REQUEST_GAP_MS);

      const results = standings.standings.results;
      while (entryIndexInPage < results.length && fetched < tier.budgetPerTick) {
        const standing = results[entryIndexInPage];
        if (!standing) {
          entryIndexInPage += 1;
          continue;
        }
        const picks = await fetchEntryPicks(standing.entry, gw);
        fetched += 1;
        if (picks) {
          mergePicks(agg, standing.entry, picks);
          addTransfers(agg, null, null);
        } else {
          await pauseFetcher(env, 300);
          break;
        }
        entryIndexInPage += 1;
        await sleep(REQUEST_GAP_MS);
      }

      if (entryIndexInPage >= results.length) {
        page += 1;
        entryIndexInPage = 0;
      }
    }

    await writeAggregate(env, gw, tier.slug, agg);
    await writeCursor(env, gw, tier.slug, { page, entryIndexInPage });

    const done = page > tier.pagesToFetch;
    return { done, fetched, paused: false };
  } finally {
    await releaseLock(env, gw, tier.slug);
  }
}
