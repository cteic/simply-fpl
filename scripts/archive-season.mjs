#!/usr/bin/env node
// Archive a finished FPL season for offline replay.
//
// Hits the PUBLIC FPL API directly (not the SimplyFPL Worker) with a
// descriptive User-Agent. Idempotent and resumable: every output file is
// skipped if it already exists, so a re-run only fetches what is missing.
// Requests are throttled (300-500ms jitter) with exponential backoff + retry
// on 429/5xx so we stay friendly with FPL's rate limits.
//
// Captures only FINAL gameweeks (finished === true AND data_checked === true).
// Unfinished gameweeks (e.g. the live final GW) are listed as pending in the
// manifest and skipped until a later top-up run.
//
// Output tree (under var/season-archive/<season>/):
//   bootstrap-static.json
//   gw<N>/live.json.gz         (gzipped — large)
//   gw<N>/fixtures.json
//   league-<id>/standings/page-<p>.json
//   league-<id>/entry/<id>/entry.json
//   league-<id>/entry/<id>/history.json
//   league-<id>/entry/<id>/picks/gw<N>.json
//   manifest.json
//
// Usage:
//   node scripts/archive-season.mjs
//   node scripts/archive-season.mjs --season=2025-26 --league=936326
//   node scripts/archive-season.mjs --max-entries=5   (quick smoke test)
//
// Run from a network that can reach fantasy.premierleague.com (e.g. a laptop).
import { access, mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const FPL_BASE = 'https://fantasy.premierleague.com/api';
const USER_AGENT =
  'SimplyFPL-SeasonArchive/1.0 (+https://github.com/pete-watters/simply-fpl; pete@cteic.ie)';

const MIN_GAP_MS = 300;
const MAX_GAP_MS = 500;
const MAX_ATTEMPTS = 6;
const BACKOFF_BASE_MS = 1000;
const BACKOFF_CAP_MS = 60_000;

const args = parseArgs(process.argv.slice(2));
const SEASON = String(args.season ?? '2025-26');
const LEAGUE_ID = Number(args.league ?? 936326);
const MAX_ENTRIES = args['max-entries'] ? Number(args['max-entries']) : null;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, '..');
const OUT_ROOT = args.out ? String(args.out) : join(repoRoot, 'var', 'season-archive', SEASON);
const LEAGUE_DIR = join(OUT_ROOT, `league-${LEAGUE_ID}`);

let lastRequestAt = 0;

function log(msg) {
  process.stdout.write(`[${new Date().toISOString()}] ${msg}\n`);
}

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    const m = a.match(/^--([^=]+)=(.+)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function nextGapMs() {
  return MIN_GAP_MS + Math.floor(Math.random() * (MAX_GAP_MS - MIN_GAP_MS + 1));
}

async function pace() {
  const wait = lastRequestAt + nextGapMs() - Date.now();
  if (wait > 0) await sleep(wait);
}

async function pathExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function writeAtomic(filePath, buffer) {
  await mkdir(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}`;
  await writeFile(tmp, buffer);
  await rename(tmp, filePath);
}

async function writeJsonAtomic(filePath, data) {
  await writeAtomic(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function writeGzipAtomic(filePath, data) {
  await writeAtomic(filePath, gzipSync(Buffer.from(JSON.stringify(data))));
}

// Returns parsed JSON, or null when allow404 and the resource is missing.
// Retries 429/5xx with exponential backoff (honouring Retry-After); throws on
// any other non-ok status so blockers surface loudly.
async function fetchJson(path, { allow404 = false } = {}) {
  const url = `${FPL_BASE}${path}`;
  let backoff = BACKOFF_BASE_MS;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await pace();
    lastRequestAt = Date.now();
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    lastRequestAt = Date.now();

    if (res.ok) return res.json();
    if (res.status === 404 && allow404) return null;

    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get('retry-after'));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoff;
      log(`${res.status} on ${path} — attempt ${attempt}/${MAX_ATTEMPTS}, waiting ${waitMs}ms`);
      await sleep(waitMs);
      backoff = Math.min(backoff * 2, BACKOFF_CAP_MS);
      continue;
    }

    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} on ${path} ${body.slice(0, 200)}`.trim());
  }
  throw new Error(`Giving up on ${path} after ${MAX_ATTEMPTS} attempts`);
}

// Fetch+write only when the target file is missing. Returns 'written',
// 'skipped', or 'missing' (404 with allow404).
async function captureFile(filePath, path, { gzip = false, allow404 = false } = {}) {
  if (await pathExists(filePath)) return 'skipped';
  const data = await fetchJson(path, { allow404 });
  if (data === null) return 'missing';
  if (gzip) await writeGzipAtomic(filePath, data);
  else await writeJsonAtomic(filePath, data);
  return 'written';
}

async function loadOrFetchBootstrap() {
  const bootstrapPath = join(OUT_ROOT, 'bootstrap-static.json');
  if (await pathExists(bootstrapPath)) {
    log('bootstrap-static.json present — loading from disk');
    return JSON.parse(await readFile(bootstrapPath, 'utf8'));
  }
  log('fetching bootstrap-static');
  const bootstrap = await fetchJson('/bootstrap-static/');
  await writeJsonAtomic(bootstrapPath, bootstrap);
  return bootstrap;
}

async function capturePartA(finalGws) {
  log(`Part A — backbone for ${finalGws.length} final gameweeks`);
  for (const gw of finalGws) {
    const gwDir = join(OUT_ROOT, `gw${gw}`);
    const live = await captureFile(join(gwDir, 'live.json.gz'), `/event/${gw}/live/`, {
      gzip: true,
    });
    const fixtures = await captureFile(join(gwDir, 'fixtures.json'), `/fixtures/?event=${gw}`);
    log(`gw${gw}: live=${live} fixtures=${fixtures}`);
  }
}

async function collectLeagueEntries() {
  log(`Part B — league ${LEAGUE_ID} standings`);
  const entryIds = [];
  let leagueName = null;
  let page = 1;
  for (;;) {
    const pageFile = join(LEAGUE_DIR, 'standings', `page-${page}.json`);
    let pageData;
    if (await pathExists(pageFile)) {
      pageData = JSON.parse(await readFile(pageFile, 'utf8'));
    } else {
      pageData = await fetchJson(`/leagues-classic/${LEAGUE_ID}/standings/?page_standings=${page}`);
      await writeJsonAtomic(pageFile, pageData);
    }
    leagueName = leagueName ?? pageData?.league?.name ?? null;
    const results = pageData?.standings?.results ?? [];
    for (const row of results) {
      if (typeof row.entry === 'number') entryIds.push(row.entry);
    }
    log(`standings page ${page}: ${results.length} entries`);
    if (!pageData?.standings?.has_next) break;
    page += 1;
  }
  let unique = [...new Set(entryIds)];
  if (MAX_ENTRIES) unique = unique.slice(0, MAX_ENTRIES);
  return { entryIds: unique, leagueName, pages: page };
}

async function captureEntries(entryIds, finalGws) {
  let missingPicks = 0;
  for (let i = 0; i < entryIds.length; i++) {
    const id = entryIds[i];
    const entryDir = join(LEAGUE_DIR, 'entry', String(id));
    await captureFile(join(entryDir, 'entry.json'), `/entry/${id}/`);
    await captureFile(join(entryDir, 'history.json'), `/entry/${id}/history/`);
    for (const gw of finalGws) {
      const result = await captureFile(
        join(entryDir, 'picks', `gw${gw}.json`),
        `/entry/${id}/event/${gw}/picks/`,
        { allow404: true }
      );
      if (result === 'missing') missingPicks += 1;
    }
    if ((i + 1) % 10 === 0 || i + 1 === entryIds.length) {
      log(`entries ${i + 1}/${entryIds.length}`);
    }
  }
  return { missingPicks };
}

async function walkFiles(dir) {
  const found = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await walkFiles(full)));
    } else if (entry.name !== 'manifest.json' && !entry.name.includes('.tmp-')) {
      const info = await stat(full);
      found.push({
        path: relative(OUT_ROOT, full),
        bytes: info.size,
        modifiedAt: info.mtime.toISOString(),
      });
    }
  }
  return found;
}

function categorise(relPath) {
  if (relPath === 'bootstrap-static.json') return 'bootstrap';
  if (/^gw\d+\/live\.json\.gz$/.test(relPath)) return 'partA.live';
  if (/^gw\d+\/fixtures\.json$/.test(relPath)) return 'partA.fixtures';
  if (relPath.includes('/standings/')) return 'partB.standings';
  if (relPath.endsWith('/entry.json')) return 'partB.entries';
  if (relPath.endsWith('/history.json')) return 'partB.history';
  if (relPath.includes('/picks/')) return 'partB.picks';
  return 'other';
}

async function writeManifest(bootstrap, finalGws, pendingGws, league, missingPicks) {
  const files = await walkFiles(OUT_ROOT);
  const byCategory = {};
  let totalBytes = 0;
  for (const file of files) {
    const cat = categorise(file.path);
    byCategory[cat] = byCategory[cat] ?? { files: 0, bytes: 0 };
    byCategory[cat].files += 1;
    byCategory[cat].bytes += file.bytes;
    totalBytes += file.bytes;
  }

  const manifest = {
    season: SEASON,
    generatedAt: new Date().toISOString(),
    source: `${FPL_BASE} (public API, direct)`,
    userAgent: USER_AGENT,
    bootstrap: {
      players: bootstrap.elements?.length ?? 0,
      teams: bootstrap.teams?.length ?? 0,
      events: bootstrap.events?.length ?? 0,
    },
    gameweeks: {
      captured: finalGws,
      pending: pendingGws,
      note: 'gw38 (and any other unfinished gameweek) is pending the Sunday 2026-05-24 top-up run.',
    },
    league: {
      id: LEAGUE_ID,
      name: league.leagueName,
      standingsPages: league.pages,
      entryCount: league.entryIds.length,
      missingPicks,
    },
    totals: {
      fileCount: files.length,
      totalBytes,
      byCategory,
    },
    files,
  };
  await writeJsonAtomic(join(OUT_ROOT, 'manifest.json'), manifest);
  return manifest;
}

async function main() {
  await mkdir(OUT_ROOT, { recursive: true });
  log(`archiving season ${SEASON} → ${OUT_ROOT}`);

  const bootstrap = await loadOrFetchBootstrap();
  const events = bootstrap.events ?? [];
  const finalGws = events
    .filter((e) => e.finished === true && e.data_checked === true)
    .map((e) => e.id)
    .sort((a, b) => a - b);
  const pendingGws = events
    .filter((e) => !(e.finished === true && e.data_checked === true))
    .map((e) => e.id)
    .sort((a, b) => a - b);

  log(`final gameweeks: ${finalGws.join(', ') || '(none)'}`);
  log(`pending gameweeks: ${pendingGws.join(', ') || '(none)'}`);

  await capturePartA(finalGws);
  const league = await collectLeagueEntries();
  log(`league entries to capture: ${league.entryIds.length}`);
  const { missingPicks } = await captureEntries(league.entryIds, finalGws);

  const manifest = await writeManifest(bootstrap, finalGws, pendingGws, league, missingPicks);
  log(
    `done — ${manifest.totals.fileCount} files, ${(manifest.totals.totalBytes / 1_048_576).toFixed(1)} MB, ${finalGws.length} gameweeks, ${league.entryIds.length} entries`
  );
}

main().catch((err) => {
  log(`fatal: ${err.stack ?? err.message}`);
  if (String(err.message).includes('host_not_allowed') || String(err.message).startsWith('403')) {
    log(
      'hint: this network cannot reach fantasy.premierleague.com — run from a host with FPL access.'
    );
  }
  process.exit(1);
});
