#!/usr/bin/env node
// Derive Top 1k cohort from existing Top 10k captures, no FPL hits.
//
// The Top 10k scrape pages league 314 in standings order (rank 1 .. 10000),
// so the first 1000 entries in each gw's `picks.jsonl` with cohort='top_10k'
// ARE the Top 1k. This script re-tags those rows as cohort='top_1k' and
// appends them to the same picks.jsonl.
//
// Idempotent: skips any gw that already contains cohort='top_1k' entries.
//
// Run AFTER the gw's picks.jsonl exists locally (it's gitignored — these
// files only live on Pete's laptop where the original scrape ran).
//
// Usage:
//   node scripts/derive-top-1k.mjs                    # all gws under var/cohorts/
//   node scripts/derive-top-1k.mjs --gw=20             # one specific gw
//   node scripts/derive-top-1k.mjs --max=1000          # default 1000
import { existsSync } from 'node:fs';
import { appendFile, readFile, readdir, stat } from 'node:fs/promises';

const args = parseArgs(process.argv.slice(2));
const SINGLE_GW = args.gw ? Number(args.gw) : null;
const MAX = args.max ? Number(args.max) : 1000;

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

async function processGw(gw) {
  const file = `var/cohorts/gw${gw}/picks.jsonl`;
  if (!existsSync(file)) {
    log(`gw${gw}: SKIP — ${file} not found`);
    return;
  }
  const raw = await readFile(file, 'utf8');
  const lines = raw.split('\n').filter((l) => l.trim());
  let alreadyHasTop1k = 0;
  const top10k = [];
  for (const line of lines) {
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    if (row.cohort === 'top_1k') alreadyHasTop1k += 1;
    if (row.cohort === 'top_10k') top10k.push(row);
  }
  if (alreadyHasTop1k > 0) {
    log(`gw${gw}: SKIP — already has ${alreadyHasTop1k} top_1k entries`);
    return;
  }
  if (top10k.length === 0) {
    log(`gw${gw}: SKIP — no top_10k entries to derive from`);
    return;
  }
  const slice = top10k.slice(0, Math.min(MAX, top10k.length));
  for (const row of slice) {
    const derived = { ...row, cohort: 'top_1k' };
    await appendFile(file, JSON.stringify(derived) + '\n');
  }
  log(`gw${gw}: appended ${slice.length} top_1k entries (from ${top10k.length} top_10k)`);
}

async function main() {
  if (SINGLE_GW !== null) {
    await processGw(SINGLE_GW);
  } else {
    const dirs = await readdir('var/cohorts');
    const gws = dirs
      .filter((d) => /^gw\d+$/.test(d))
      .map((d) => Number(d.replace('gw', '')))
      .sort((a, b) => a - b);
    log(`processing ${gws.length} gameweeks`);
    for (const gw of gws) {
      await processGw(gw);
    }
  }
  log(
    'done — now run `node scripts/build-score-distribution.mjs --gw=N` (or loop over GWs) to refresh the committed JSONs'
  );
}

main().catch((err) => {
  log(`fatal: ${err.stack ?? err.message}`);
  process.exit(1);
});
