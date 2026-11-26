#!/usr/bin/env node
// Measure the live-rank estimate that reads FPL's points-to-rank curve against
// the committed cohort archive.
//
// Why this exists: the curve's own accuracy and the live estimate's accuracy
// are two different numbers, and conflating them flatters the feature. A
// settled lookup (what rank is 606 points worth) is near exact. A live
// estimate (what rank am I on right now) also has to guess what the rest of
// the field has scored, and that guess is where the error lives.
//
// Method: every (total_points, overall_rank) pair in var/cohorts/gw<N>/
// comes from FPL, so each pair sits exactly on the true curve for that
// gameweek. A cohort oversamples the top, which changes how densely the
// samples sit along the curve, not whether they are right. So GW N-1's cohort
// builds a dense curve, and GW N's cohort is replayed against it: for every
// entry, predict the live rank from their pre-gameweek total plus this
// gameweek's points, shifted by the field average, and compare to the rank FPL
// actually gave them.
//
// This is the live path with a denser curve than production samples. Read it
// with the 42-page holdout figure in rank-curve.spec.ts, which bounds what
// sampling costs.
//
// Requires Node >= 22.15 (module.registerHooks and native TS import).
//
// Usage:
//   node scripts/measure-rank-curve.mjs
import { existsSync, readFileSync } from 'node:fs';
import * as nodeModule from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

nodeModule.registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      !/\.(ts|tsx|js|mjs|cjs|json)$/.test(specifier)
    ) {
      const parentPath = context.parentURL ? fileURLToPath(context.parentURL) : process.cwd();
      if (existsSync(join(dirname(parentPath), `${specifier}.ts`))) {
        return nextResolve(`${specifier}.ts`, context);
      }
    }
    return nextResolve(specifier, context);
  },
});

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { buildRankCurve } = await import(`${ROOT}/packages/fpl-client/src/rank-curve.ts`);
const { estimateLiveRankFromCurve, estimateLiveRank } = await import(
  `${ROOT}/packages/fpl-client/src/live-rank.ts`
);

const bootstrap = JSON.parse(
  readFileSync(`${ROOT}/var/season-archive/2025-26/bootstrap-static.json`, 'utf8')
);
const avgByGw = new Map(bootstrap.events.map((e) => [e.id, e.average_entry_score]));
const rankedByGw = new Map(bootstrap.events.map((e) => [e.id, e.ranked_count || 11_000_000]));

function loadGw(gw) {
  const path = `${ROOT}/var/cohorts/gw${gw}/picks.jsonl`;
  if (!existsSync(path)) return null;
  const rows = new Map();
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    const row = JSON.parse(line);
    const h = row.picks?.entry_history;
    if (!h || typeof h.total_points !== 'number' || typeof h.overall_rank !== 'number') continue;
    if (h.overall_rank <= 0) continue;
    rows.set(row.entryId, { total: h.total_points, points: h.points, rank: h.overall_rank });
  }
  return rows;
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}

const BANDS = [
  { label: '1 - 1k', lo: 1, hi: 1_000 },
  { label: '1k - 10k', lo: 1_001, hi: 10_000 },
  { label: '10k - 100k', lo: 10_001, hi: 100_000 },
  { label: '100k - 1M', lo: 100_001, hi: 1_000_000 },
  { label: '1M+', lo: 1_000_001, hi: Infinity },
];
const bandErr = new Map(
  BANDS.map((b) => [b.label, { curve: [], flat: [], absCurve: [], absFlat: [] }])
);
function bandOf(rank) {
  for (const b of BANDS) if (rank >= b.lo && rank <= b.hi) return b.label;
  return BANDS[BANDS.length - 1].label;
}
const curveErr = [],
  flatErr = [];
const perGw = [];
let prev = loadGw(1);
for (let gw = 2; gw <= 38; gw += 1) {
  const curr = loadGw(gw);
  if (!prev || !curr) {
    prev = curr;
    continue;
  }

  // Every (total, overall_rank) pair from FPL sits exactly on the true curve,
  // so a biased cohort still yields correct points, just unevenly spaced.
  const samples = [...prev.values()].map((r) => ({ rank: r.rank, totalPoints: r.total }));
  const curve = buildRankCurve({ gw: gw - 1, rankedCount: rankedByGw.get(gw - 1), samples });
  if (!curve) {
    prev = curr;
    continue;
  }

  const avg = avgByGw.get(gw) ?? 0;
  const gwCurve = [],
    gwFlat = [];
  for (const [entryId, row] of curr) {
    const before = prev.get(entryId);
    if (!before) continue;
    const preGwTotal = row.total - row.points;
    if (preGwTotal <= 0) continue;

    const c = estimateLiveRankFromCurve({
      curve,
      preGwTotal,
      livePoints: row.points,
      fieldLiveAverage: avg,
      preGwRank: before.rank,
    });
    const f = estimateLiveRank(before.rank, row.points, avg);
    const ce = (Math.abs(c.liveRank - row.rank) / row.rank) * 100;
    const fe = (Math.abs(f.liveRank - row.rank) / row.rank) * 100;
    gwCurve.push(ce);
    gwFlat.push(fe);
    curveErr.push(ce);
    flatErr.push(fe);
    const bucket = bandErr.get(bandOf(row.rank));
    bucket.curve.push(ce);
    bucket.flat.push(fe);
    bucket.absCurve.push(Math.abs(c.liveRank - row.rank));
    bucket.absFlat.push(Math.abs(f.liveRank - row.rank));
  }
  if (gwCurve.length > 0) {
    perGw.push({ gw, n: gwCurve.length, curve: median(gwCurve), flat: median(gwFlat) });
  }
  prev = curr;
}

console.log(
  `gameweeks measured: ${perGw.length}   (entry, gameweek) pairs: ${curveErr.length.toLocaleString()}`
);
console.log();
console.log('median absolute rank error, live path');
console.log(`  points-to-rank curve : ${median(curveErr).toFixed(2)}%`);
console.log(`  flat-700 heuristic   : ${median(flatErr).toFixed(2)}%`);
console.log();
const wins = perGw.filter((r) => r.curve < r.flat).length;
console.log(`curve beats flat in ${wins} of ${perGw.length} gameweeks`);
console.log();
console.log('by true rank band (median)');
console.log(
  `  ${'band'.padEnd(12)} ${'n'.padStart(7)} ${'curve %'.padStart(9)} ${'flat %'.padStart(9)} ${'curve places'.padStart(13)} ${'flat places'.padStart(12)}`
);
for (const b of BANDS) {
  const e = bandErr.get(b.label);
  if (e.curve.length === 0) continue;
  console.log(
    `  ${b.label.padEnd(12)} ${String(e.curve.length).padStart(7)} ${median(e.curve).toFixed(1).padStart(8)}% ${median(e.flat).toFixed(1).padStart(8)}% ${median(e.absCurve).toLocaleString().padStart(13)} ${median(e.absFlat).toLocaleString().padStart(12)}`
  );
}
console.log();
console.log(' gw      n    curve     flat   winner');
for (const r of perGw) {
  console.log(
    `  ${String(r.gw).padStart(2)} ${String(r.n).padStart(6)} ${r.curve.toFixed(2).padStart(7)}% ${r.flat.toFixed(2).padStart(7)}%   ${r.curve < r.flat ? 'curve' : 'flat'}`
  );
}
