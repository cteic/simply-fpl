#!/usr/bin/env node
// Build the static replay bundle the /replay route loads in the browser.
//
// Reads from var/season-archive/<season>/ (committed offline archive) and
// emits per-gameweek JSON files plus a single manifest under
// apps/web/public/replay/<season>/. The output is committed to the repo so
// the demo route works offline with no Worker / FPL hits.
//
// Each per-GW file holds only the fields the live-rank dashboard reads:
//   - picks (full picks JSON for the chosen entry)
//   - live  (FplLiveGameweek with slim explain payloads)
//   - fixtures (fixtures for that GW)
//   - history (the row from history.json for that GW)
//
// Bootstrap stays in a single bootstrap.json; the entry profile sits in
// the manifest.
//
// Usage:
//   node scripts/build-replay-bundle.mjs
//   node scripts/build-replay-bundle.mjs --season=2025-26 --league=936326 --entry=1831434
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');

const args = parseArgs(process.argv.slice(2));
const SEASON = args.season ?? '2025-26';
const LEAGUE_ID = Number(args.league ?? 936326);
const ENTRY_ID = Number(args.entry ?? 1831434);

const ARCHIVE_ROOT = join(REPO_ROOT, 'var', 'season-archive', SEASON);
const OUT_ROOT = join(REPO_ROOT, 'apps', 'web', 'public', 'replay', SEASON);

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    const m = a.match(/^--([^=]+)=(.+)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function log(msg) {
  process.stdout.write(`[build-replay-bundle] ${msg}\n`);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readJsonGz(path) {
  const buf = await readFile(path);
  const text = gunzipSync(buf).toString('utf8');
  return JSON.parse(text);
}

function slimBootstrap(boot) {
  return {
    chips: boot.chips ?? [],
    events: (boot.events ?? []).map((e) => ({
      id: e.id,
      name: e.name,
      deadline_time: e.deadline_time,
      average_entry_score: e.average_entry_score,
      highest_score: e.highest_score,
      finished: e.finished,
    })),
    game_settings: boot.game_settings ?? {},
    game_config: boot.game_config ?? {},
    phases: boot.phases ?? [],
    teams: boot.teams ?? [],
    total_players: boot.total_players ?? 0,
    element_stats: boot.element_stats ?? [],
    element_types: boot.element_types ?? [],
    elements: (boot.elements ?? []).map((p) => ({
      id: p.id,
      web_name: p.web_name,
      team: p.team,
      element_type: p.element_type,
      selected_by_percent: p.selected_by_percent ?? '0',
      now_cost: p.now_cost ?? 0,
      total_points: p.total_points ?? 0,
      photo: p.photo ?? '',
      code: p.code ?? 0,
      first_name: p.first_name ?? '',
      second_name: p.second_name ?? '',
    })),
  };
}

function slimLive(live) {
  if (!live || !Array.isArray(live.elements)) return { elements: [] };
  const elements = live.elements.map((el) => ({
    id: el.id,
    stats: {
      minutes: el.stats?.minutes ?? 0,
      goals_scored: el.stats?.goals_scored ?? 0,
      assists: el.stats?.assists ?? 0,
      clean_sheets: el.stats?.clean_sheets ?? 0,
      goals_conceded: el.stats?.goals_conceded ?? 0,
      yellow_cards: el.stats?.yellow_cards ?? 0,
      red_cards: el.stats?.red_cards ?? 0,
      saves: el.stats?.saves ?? 0,
      bonus: el.stats?.bonus ?? 0,
      bps: el.stats?.bps ?? 0,
      total_points: el.stats?.total_points ?? 0,
    },
    explain: (el.explain ?? []).map((ex) => ({
      fixture: ex.fixture,
      stats: [],
    })),
  }));
  return { elements };
}

function findHistoryRow(history, gw) {
  if (!history || !Array.isArray(history.current)) return null;
  return history.current.find((row) => row.event === gw) ?? null;
}

async function listGameweeks() {
  const entries = await readdir(ARCHIVE_ROOT, { withFileTypes: true });
  const gws = entries
    .filter((d) => d.isDirectory() && /^gw\d+$/.test(d.name))
    .map((d) => Number(d.name.slice(2)))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 38)
    .sort((a, b) => a - b);
  return gws;
}

async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

async function main() {
  log(`season=${SEASON} league=${LEAGUE_ID} entry=${ENTRY_ID}`);
  await ensureDir(OUT_ROOT);

  const bootstrap = await readJson(join(ARCHIVE_ROOT, 'bootstrap-static.json'));
  const slimBoot = slimBootstrap(bootstrap);
  await writeFile(join(OUT_ROOT, 'bootstrap.json'), JSON.stringify(slimBoot));
  log(
    `wrote bootstrap.json (${slimBoot.elements.length} players, ${slimBoot.events.length} events)`
  );

  const entryRoot = join(ARCHIVE_ROOT, `league-${LEAGUE_ID}`, 'entry', String(ENTRY_ID));
  const entry = await readJson(join(entryRoot, 'entry.json'));
  const history = await readJson(join(entryRoot, 'history.json'));

  const gws = await listGameweeks();
  log(`found gws: ${gws.join(', ')}`);

  let written = 0;
  for (const gw of gws) {
    const picksPath = join(entryRoot, 'picks', `gw${gw}.json`);
    const livePath = join(ARCHIVE_ROOT, `gw${gw}`, 'live.json.gz');
    const fixturesPath = join(ARCHIVE_ROOT, `gw${gw}`, 'fixtures.json');

    const picks = await readJson(picksPath);
    const live = slimLive(await readJsonGz(livePath));
    const fixtures = await readJson(fixturesPath);
    const histRow = findHistoryRow(history, gw);

    const payload = {
      gw,
      picks,
      live,
      fixtures,
      history: histRow,
    };
    await writeFile(join(OUT_ROOT, `gw${gw}.json`), JSON.stringify(payload));
    written += 1;
  }
  log(`wrote ${written} per-GW files`);

  // Pre-compute pre-GW overall ranks so the replay clock can drive the
  // estimator without re-reading the entire history each tick.
  const ranksByGw = {};
  for (const row of history.current ?? []) {
    if (typeof row.event === 'number' && typeof row.overall_rank === 'number') {
      ranksByGw[row.event] = {
        overall_rank: row.overall_rank,
        total_points: row.total_points,
        points: row.points,
      };
    }
  }

  const manifest = {
    season: SEASON,
    leagueId: LEAGUE_ID,
    entryId: ENTRY_ID,
    entry: {
      id: entry.id,
      name: entry.name,
      player_first_name: entry.player_first_name,
      player_last_name: entry.player_last_name,
      summary_overall_points: entry.summary_overall_points,
      summary_overall_rank: entry.summary_overall_rank,
      summary_event_points: entry.summary_event_points,
      summary_event_rank: entry.summary_event_rank,
    },
    gameweeks: gws,
    ranksByGw,
    generatedAt: new Date().toISOString(),
  };
  await writeFile(join(OUT_ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  log(`wrote manifest.json`);

  log('done');
}

await main();
