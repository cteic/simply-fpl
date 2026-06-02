#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

const args = parseArgs(process.argv.slice(2));
const GW = Number(args.gw ?? 38);
const BIN_SIZE = args.bin ? Number(args.bin) : 5;
const COHORT_FILTER = args.cohort ? String(args.cohort) : null;
const IN_FILE = `var/cohorts/gw${GW}/picks.jsonl`;
const DIST_FILE = `var/cohorts/gw${GW}/score-distribution.json`;
const SCORES_FILE = `var/cohorts/gw${GW}/scores.json`;

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

function round1(value) {
  return Math.round(value * 10) / 10;
}

function percentile(sorted, p) {
  const n = sorted.length;
  if (n === 1) return sorted[0];
  const rank = (p / 100) * (n - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo);
}

function computePercentiles(sorted) {
  return {
    p1: round1(percentile(sorted, 1)),
    p5: round1(percentile(sorted, 5)),
    p10: round1(percentile(sorted, 10)),
    p25: round1(percentile(sorted, 25)),
    p50: round1(percentile(sorted, 50)),
    p75: round1(percentile(sorted, 75)),
    p90: round1(percentile(sorted, 90)),
    p95: round1(percentile(sorted, 95)),
    p99: round1(percentile(sorted, 99)),
  };
}

function buildHistogram(sorted, binSize) {
  const lo = Math.min(...sorted);
  const hi = Math.max(...sorted);
  const start = Math.floor(lo / binSize) * binSize;
  const bins = [];
  for (let binMin = start; binMin <= hi; binMin += binSize) {
    const binMax = binMin + binSize;
    let count = 0;
    for (const score of sorted) {
      if (score >= binMin && score < binMax) count += 1;
    }
    bins.push({ min: binMin, max: binMax, count });
  }
  return bins;
}

function computeScoreDistribution(scores, binSize) {
  const sorted = [...scores].sort((a, b) => a - b);
  const sampleSize = sorted.length;
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  return {
    sampleSize,
    min: Math.min(...sorted),
    max: Math.max(...sorted),
    mean: round1(sum / sampleSize),
    median: round1(percentile(sorted, 50)),
    percentiles: computePercentiles(sorted),
    histogram: buildHistogram(sorted, binSize),
  };
}

async function main() {
  log(`reading ${IN_FILE}`);
  const rows = await readJsonl(IN_FILE);

  const scoresByCohort = new Map();
  for (const row of rows) {
    if (COHORT_FILTER && row.cohort !== COHORT_FILTER) continue;
    const points = row?.picks?.entry_history?.points;
    if (typeof points !== 'number') continue;
    const arr = scoresByCohort.get(row.cohort) ?? [];
    arr.push(points);
    scoresByCohort.set(row.cohort, arr);
  }

  const distributions = {};
  const rawScores = {};
  for (const [cohort, scores] of scoresByCohort) {
    if (scores.length === 0) {
      log(`cohort ${cohort}: no scores, skipping`);
      continue;
    }
    distributions[cohort] = computeScoreDistribution(scores, BIN_SIZE);
    rawScores[cohort] = scores;
    const d = distributions[cohort];
    log(
      `cohort ${cohort}: n=${d.sampleSize} mean=${d.mean} median=${d.median} p1=${d.percentiles.p1} p99=${d.percentiles.p99} range=${d.min}-${d.max}`
    );
  }

  if (Object.keys(distributions).length === 0) {
    throw new Error(`no scores found in ${IN_FILE} — run the scrape first`);
  }

  const distPayload = {
    gw: GW,
    builtAt: new Date().toISOString(),
    binSize: BIN_SIZE,
    cohorts: distributions,
  };
  await writeFile(DIST_FILE, JSON.stringify(distPayload, null, 2));
  log(`wrote ${DIST_FILE}`);

  const scoresPayload = {
    gw: GW,
    builtAt: new Date().toISOString(),
    cohorts: rawScores,
  };
  await writeFile(SCORES_FILE, JSON.stringify(scoresPayload));
  log(`wrote ${SCORES_FILE}`);
}

main().catch((err) => {
  log(`fatal: ${err.stack ?? err.message}`);
  process.exit(1);
});
