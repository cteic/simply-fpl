#!/usr/bin/env node
// Build cohort aggregates from `var/cohorts/gw{N}/picks.jsonl`.
//
// Outputs `var/cohorts/gw{N}/aggregates.json` with the four metrics the cohort
// table displays:
//   - score          : mean of entry_history.points across the cohort
//   - playersPlayed  : mean # picks with multiplier > 0 and minutes (TODO)
//   - budgetPlayed   : mean now_cost of starting XI (TODO: needs bootstrap)
//   - captainPoints  : mean captain element_points (TODO: needs live data)
//
// For the dress rehearsal the aggregator is a scaffold — it computes `score`
// (the only metric derivable from picks alone) and emits TODO placeholders
// for the other three. Pete will run this after the scrape and we'll fill in
// the bootstrap-aware metrics later in the week.
//
// Usage:
//   node scripts/build-cohort-aggregates.mjs --gw=36
import { readFile, writeFile } from 'node:fs/promises';

const args = parseArgs(process.argv.slice(2));
const GW = Number(args.gw ?? 36);
const IN_FILE = `var/cohorts/gw${GW}/picks.jsonl`;
const OUT_FILE = `var/cohorts/gw${GW}/aggregates.json`;

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    const m = a.match(/^--([^=]+)=(.+)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function log(msg) {
  process.stdout.write(`[${new Date().toISOString()}] ${msg}\n`);
}

function mean(nums) {
  if (nums.length === 0) return null;
  const total = nums.reduce((a, b) => a + b, 0);
  return Math.round((total / nums.length) * 10) / 10;
}

async function readJsonl(path) {
  const raw = await readFile(path, 'utf8');
  const rows = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      rows.push(JSON.parse(trimmed));
    } catch (err) {
      log(`bad line skipped: ${err.message}`);
    }
  }
  return rows;
}

function aggregateCohort(rows) {
  const scores = [];
  for (const row of rows) {
    const points = row?.picks?.entry_history?.points;
    if (typeof points === 'number') scores.push(points);
  }
  return {
    sampleSize: rows.length,
    score: mean(scores),
    playersPlayed: null,
    budgetPlayed: null,
    captainPoints: null,
  };
}

async function main() {
  log(`reading ${IN_FILE}`);
  const rows = await readJsonl(IN_FILE);
  const byCohort = new Map();
  for (const row of rows) {
    const arr = byCohort.get(row.cohort) ?? [];
    arr.push(row);
    byCohort.set(row.cohort, arr);
  }

  const aggregates = {};
  for (const [cohort, cohortRows] of byCohort) {
    aggregates[cohort] = aggregateCohort(cohortRows);
    log(`cohort ${cohort}: ${cohortRows.length} entries → score=${aggregates[cohort].score}`);
  }

  const payload = {
    gw: GW,
    builtAt: new Date().toISOString(),
    cohorts: aggregates,
    todo: [
      'playersPlayed: needs bootstrap + live to count picks with minutes>0',
      'budgetPlayed: needs bootstrap.elements[].now_cost summed for the XI',
      'captainPoints: needs live event_points for captained element',
    ],
  };

  await writeFile(OUT_FILE, JSON.stringify(payload, null, 2));
  log(`wrote ${OUT_FILE}`);
}

main().catch((err) => {
  log(`fatal: ${err.stack ?? err.message}`);
  process.exit(1);
});
