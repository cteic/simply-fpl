#!/usr/bin/env node
// Replay a finished, archived FPL season offline.
//
// Steps GW1..N over var/season-archive/<season>/, recomputing each gameweek's
// points for an entry from the archived picks + live data (using the final
// per-pick multiplier, so autosubs / captain / chips are reflected) and
// applying the live-rank heuristic. Both are checked against FPL's official
// per-gameweek figures so the replay is self-verifying.
//
// Pure offline: reads the committed archive only, no network, no worker. The
// math mirrors fpl-client's calculateLivePoints / estimateLiveRank (fpl-client
// ships TS source only, so scripts re-implement rather than import it, the same
// way generate-recording.mjs does).
//
// Usage:
//   node scripts/replay-season.mjs
//   node scripts/replay-season.mjs --entry=113765
//   node scripts/replay-season.mjs --season=2025-26 --league=936326
//   node scripts/replay-season.mjs --speed=150   (ms pause between gameweeks)
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const PLACES_PER_POINT = 700;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)=(.+)$/);
    if (match) out[match[1]] = match[2];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const SEASON = String(args.season ?? '2025-26');
const LEAGUE_ID = Number(args.league ?? 936326);
const SPEED_MS = args.speed ? Math.max(0, Number(args.speed)) : 0;
const ARCHIVE = join(ROOT, 'var', 'season-archive', SEASON);

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readGzJson(path) {
  return JSON.parse(gunzipSync(readFileSync(path)).toString('utf8'));
}

function gameweekPoints(picks, liveData) {
  const liveMap = new Map(liveData.elements.map((element) => [element.id, element]));
  let total = 0;
  for (const pick of picks.picks) {
    const live = liveMap.get(pick.element);
    if (!live) continue;
    total += live.stats.total_points * pick.multiplier;
  }
  return total;
}

function estimateLiveRank(preGwRank, livePoints, avgEntryScore) {
  const movement = Math.round((livePoints - avgEntryScore) * PLACES_PER_POINT);
  return Math.max(1, preGwRank - movement);
}

function resolveEntryId() {
  if (args.entry) return Number(args.entry);
  const entryDir = join(ARCHIVE, `league-${LEAGUE_ID}`, 'entry');
  const ids = readdirSync(entryDir)
    .map((name) => Number(name))
    .filter((id) => Number.isFinite(id))
    .sort((a, b) => a - b);
  if (ids.length === 0) throw new Error(`no entries under ${entryDir}`);
  return ids[0];
}

function pct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function pad(value, width) {
  return String(value).padStart(width);
}

async function main() {
  if (!existsSync(ARCHIVE)) {
    log(`No archive at ${ARCHIVE} — run scripts/archive-season.mjs first.`);
    process.exit(1);
  }

  const manifest = readJson(join(ARCHIVE, 'manifest.json'));
  const bootstrap = readJson(join(ARCHIVE, 'bootstrap-static.json'));
  const captured = manifest.gameweeks?.captured ?? [];
  const eventsById = new Map(bootstrap.events.map((event) => [event.id, event]));

  const entryId = resolveEntryId();
  const entryDir = join(ARCHIVE, `league-${LEAGUE_ID}`, 'entry', String(entryId));
  const entry = readJson(join(entryDir, 'entry.json'));
  const history = readJson(join(entryDir, 'history.json'));
  const historyByGw = new Map(history.current.map((row) => [row.event, row]));

  const manager = `${entry.player_first_name ?? ''} ${entry.player_last_name ?? ''}`.trim();
  const label = entry.name ?? `entry ${entryId}`;
  log(`Replaying ${SEASON} — ${label}${manager ? ` (${manager})` : ''} [entry ${entryId}]`);
  log(
    `${captured.length} gameweeks captured${manifest.gameweeks?.pending?.length ? `, pending: ${manifest.gameweeks.pending.join(', ')}` : ''}\n`
  );
  log('GW   pts  off    Δ   total    estRank      offRank   rankErr');

  const rows = [];
  let runningNet = 0;
  let exactPts = 0;
  for (const gw of captured) {
    const picksPath = join(entryDir, 'picks', `gw${gw}.json`);
    const livePath = join(ARCHIVE, `gw${gw}`, 'live.json.gz');
    if (!existsSync(picksPath) || !existsSync(livePath)) {
      log(`${pad(gw, 2)}  missing data — skipped`);
      continue;
    }

    const picks = readJson(picksPath);
    const live = readGzJson(livePath);

    const points = gameweekPoints(picks, live);
    const official = picks.entry_history.points;
    if (points === official) exactPts += 1;
    runningNet += points - picks.entry_history.event_transfers_cost;

    const prev = historyByGw.get(gw - 1);
    const preGwRank = prev?.overall_rank ?? historyByGw.get(gw)?.overall_rank ?? 0;
    const avg = eventsById.get(gw)?.average_entry_score ?? 0;
    const estRank = estimateLiveRank(preGwRank, points, avg);
    const offRank = historyByGw.get(gw)?.overall_rank ?? 0;
    const rankErr = offRank > 0 ? Math.abs(estRank - offRank) / offRank : 0;

    rows.push({ gw, points, official, total: runningNet, estRank, offRank, rankErr });
    log(
      `${pad(gw, 2)}  ${pad(points, 4)} ${pad(official, 4)} ${pad(points - official, 4)}  ${pad(runningNet, 6)}  ${pad(estRank, 11)}  ${pad(offRank, 11)}  ${pad(pct(rankErr), 7)}`
    );

    if (SPEED_MS > 0) await sleep(SPEED_MS);
  }

  const lastGw = captured[captured.length - 1];
  const officialTotal = historyByGw.get(lastGw)?.total_points ?? 0;
  const meanRankErr = rows.length
    ? rows.reduce((sum, row) => sum + row.rankErr, 0) / rows.length
    : 0;
  log(
    `\nReplayed ${rows.length} GWs. Per-GW points exact: ${exactPts}/${rows.length}. ` +
      `Net total ${runningNet} vs official ${officialTotal}. Mean live-rank error ${pct(meanRankErr)}.`
  );

  const outPath = join(ROOT, 'var', `replay-season-${SEASON}-${entryId}.json`);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(
    outPath,
    `${JSON.stringify({ season: SEASON, entryId, label, manager, generatedAt: new Date().toISOString(), rows }, null, 2)}\n`
  );
  log(`Wrote ${outPath}`);
}

main().catch((err) => {
  process.stderr.write(`${String(err?.stack ?? err)}\n`);
  process.exit(1);
});
