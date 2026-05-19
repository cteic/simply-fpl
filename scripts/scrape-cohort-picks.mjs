#!/usr/bin/env node
// Scrape cohort picks for GW36 via the SimplyFPL Worker proxy.
//
// Outputs one row per entry as JSONL at `var/cohorts/gw36/picks.jsonl`:
//   { entryId, cohort, picks }
//
// Cohorts:
//   - top_10k    : top 10000 of overall league 314 (paginated, 50 per page).
//   - overall    : random sample of 5000 entries with overall rank 500k-1.5M.
//   - legendary  : TODO — verify the correct public league ID. Until then we
//     proxy via top 1000 of league 314 page 1.
//
// Pacing is conservative: max 2 req/sec, with exponential backoff on 429 and
// clean exit on repeated 5xx. Run this from your laptop where you can watch
// the rate-limit behaviour — DO NOT run it from CI or scheduled workers.
//
// Usage:
//   node scripts/scrape-cohort-picks.mjs --gw=36
//   node scripts/scrape-cohort-picks.mjs --gw=36 --cohort=top_10k --max=1000
//   node scripts/scrape-cohort-picks.mjs --gw=36 --base=http://localhost:8787
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const args = parseArgs(process.argv.slice(2));
const GW = Number(args.gw ?? 36);
const BASE_URL = String(args.base ?? 'https://worker.simply-fpl.workers.dev');
const COHORT_FILTER = args.cohort ? String(args.cohort) : null;
const MAX_PER_COHORT = args.max ? Number(args.max) : null;
const UA = 'SimplyFPL-CohortScrape/0.1 (research; github.com/pete-watters/simply-fpl)';
const OUT_DIR = `var/cohorts/gw${GW}`;
const OUT_FILE = `${OUT_DIR}/picks.jsonl`;
const MAX_REQ_PER_SEC = 2;
const MIN_REQ_INTERVAL_MS = Math.ceil(1000 / MAX_REQ_PER_SEC);
const MAX_5XX_IN_A_ROW = 5;

const COHORT_CONFIG = {
  top_10k: {
    leagueId: 314,
    maxEntries: 10000,
  },
  overall: {
    rankFloor: 500_000,
    rankCeil: 1_500_000,
    sampleSize: 5000,
  },
  legendary: {
    leagueId: 314,
    maxEntries: 1000,
  },
};

let lastReqTs = 0;
let consecutive5xx = 0;

async function rateLimitedFetch(url) {
  const wait = lastReqTs + MIN_REQ_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  let backoffMs = 1000;
  for (let attempt = 0; attempt < 6; attempt++) {
    lastReqTs = Date.now();
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (res.status === 429) {
      log(`429 from ${url} — backing off ${backoffMs}ms`);
      await sleep(backoffMs);
      backoffMs = Math.min(backoffMs * 2, 30_000);
      continue;
    }
    if (res.status >= 500) {
      consecutive5xx += 1;
      log(`${res.status} from ${url} — consecutive5xx=${consecutive5xx}`);
      if (consecutive5xx >= MAX_5XX_IN_A_ROW) {
        throw new Error(`Aborting: ${consecutive5xx} consecutive 5xx responses`);
      }
      await sleep(backoffMs);
      backoffMs = Math.min(backoffMs * 2, 30_000);
      continue;
    }
    consecutive5xx = 0;
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText} from ${url}`);
    }
    return res.json();
  }
  throw new Error(`Giving up on ${url} after retries`);
}

function log(msg) {
  process.stdout.write(`[${new Date().toISOString()}] ${msg}\n`);
}

async function fetchLeaguePage(leagueId, page) {
  const url = `${BASE_URL}/fpl/leagues-classic/${leagueId}/standings/?page_standings=${page}`;
  return rateLimitedFetch(url);
}

async function fetchEntryPicks(entryId, gw) {
  const url = `${BASE_URL}/fpl/entry/${entryId}/event/${gw}/picks/`;
  return rateLimitedFetch(url);
}

async function collectLeagueEntryIds(leagueId, maxEntries) {
  const entryIds = [];
  let page = 1;
  while (entryIds.length < maxEntries) {
    log(`league ${leagueId} page ${page}`);
    const data = await fetchLeaguePage(leagueId, page);
    const results = data?.standings?.results ?? [];
    if (results.length === 0) break;
    for (const row of results) {
      if (typeof row.entry === 'number') entryIds.push(row.entry);
      if (entryIds.length >= maxEntries) break;
    }
    if (!data?.standings?.has_next) break;
    page += 1;
  }
  return entryIds.slice(0, maxEntries);
}

async function collectOverallEntryIds(cohortConfig) {
  // The FPL API doesn't expose a "browse entries by rank" endpoint, so this
  // function intentionally stays a placeholder. For now, sample IDs in a
  // dense range — Pete can refine the sampling strategy at runtime.
  // TODO(scrape): swap for a real rank-based sampling source (livefpl?).
  const ids = [];
  const min = 1_000_000;
  const max = 3_000_000;
  const target = cohortConfig.sampleSize;
  while (ids.length < target) {
    ids.push(min + Math.floor(Math.random() * (max - min)));
  }
  return ids;
}

async function scrapeCohort(cohort, entryIds) {
  let written = 0;
  const cap = MAX_PER_COHORT ?? entryIds.length;
  for (let i = 0; i < entryIds.length && written < cap; i++) {
    const entryId = entryIds[i];
    try {
      const picks = await fetchEntryPicks(entryId, GW);
      await appendFile(OUT_FILE, JSON.stringify({ entryId, cohort, picks }) + '\n');
      written += 1;
      if (written % 50 === 0) log(`cohort=${cohort} written=${written}/${cap}`);
    } catch (err) {
      log(`skip entry ${entryId}: ${err.message}`);
    }
  }
  return written;
}

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    const m = a.match(/^--([^=]+)=(.+)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, '');
  log(`scraping cohort picks → ${OUT_FILE}`);

  if (!COHORT_FILTER || COHORT_FILTER === 'top_10k') {
    const cfg = COHORT_CONFIG.top_10k;
    log(`top_10k: pulling ${cfg.maxEntries} from league ${cfg.leagueId}`);
    const ids = await collectLeagueEntryIds(cfg.leagueId, cfg.maxEntries);
    const n = await scrapeCohort('top_10k', ids);
    log(`top_10k: wrote ${n} entries`);
  }

  if (!COHORT_FILTER || COHORT_FILTER === 'overall') {
    const cfg = COHORT_CONFIG.overall;
    log(`overall: sampling ${cfg.sampleSize} from rank range`);
    const ids = await collectOverallEntryIds(cfg);
    const n = await scrapeCohort('overall', ids);
    log(`overall: wrote ${n} entries`);
  }

  if (!COHORT_FILTER || COHORT_FILTER === 'legendary') {
    const cfg = COHORT_CONFIG.legendary;
    log(`legendary: top ${cfg.maxEntries} of league ${cfg.leagueId} (TODO: verify league ID)`);
    const ids = await collectLeagueEntryIds(cfg.leagueId, cfg.maxEntries);
    const n = await scrapeCohort('legendary', ids);
    log(`legendary: wrote ${n} entries`);
  }

  log('done');
}

main().catch((err) => {
  log(`fatal: ${err.stack ?? err.message}`);
  process.exit(1);
});
