#!/usr/bin/env node
// Deterministic gameweek-simulator recording generator (RFC 005, issue #173).
//
// Produces the reproducible inputs the cohort / live-rank harness replays:
//   recording.jsonl          canonical per-gw replay rows (RFC §1 layout)
//   test-team.json           a stable "my entry" (committed fixture)
//   manager-distribution.json a sampled synthetic manager pool (compact)
//   expected-curve.json       expected overall-rank-at-time-T, derived offline
//   meta.json                 provenance + knobs
//
// Same inputs in -> same artefacts out. The scoring + rank math below mirrors
// @simplyfpl/fpl-client (calculateLivePoints / estimateLiveRank / buildExpectedCurve)
// so the committed expected-curve.json is reproduced byte-for-byte by the
// vitest harness, which recomputes it through the real package functions.
//
// Modes:
//   node scripts/generate-recording.mjs --gw=37
//       build the committed deterministic sample bundle (default out dir).
//   node scripts/generate-recording.mjs --gw=37 --in=var/recordings/gw37/raw.jsonl --out=var/recordings/gw37
//       normalise a real cadence capture into the canonical recording layout.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PLACES_PER_POINT = 700;
const POOL_SEED = 20260516;
const POOL_SIZE = 1000;
const PRE_GW_RANK = 38_859;
const TOTAL_MANAGERS = 10_900_000;
const FRAME_STEP_MIN = 10;
const FRAME_COUNT = 17;
const BASE_TS = Date.parse('2026-05-16T11:00:00.000Z');

const SAMPLE_SQUAD = [
  { id: 1, elementType: 1, strength: 168 },
  { id: 2, elementType: 2, strength: 162 },
  { id: 3, elementType: 2, strength: 154 },
  { id: 4, elementType: 3, strength: 212 },
  { id: 5, elementType: 3, strength: 152 },
  { id: 6, elementType: 3, strength: 320 },
  { id: 7, elementType: 2, strength: 178 },
  { id: 8, elementType: 1, strength: 158 },
  { id: 9, elementType: 4, strength: 296 },
  { id: 10, elementType: 3, strength: 184 },
  { id: 11, elementType: 3, strength: 244 },
  { id: 12, elementType: 4, strength: 188 },
  { id: 13, elementType: 4, strength: 180 },
  { id: 14, elementType: 2, strength: 132 },
  { id: 15, elementType: 2, strength: 148 },
];

// Final GW points per player + the simulated minute window over which they accrue.
const PLAYER_GW = {
  1: { final: 6, start: 0, end: 95 },
  2: { final: 6, start: 0, end: 95 },
  3: { final: 7, start: 0, end: 95 },
  4: { final: 9, start: 0, end: 95 },
  5: { final: 2, start: 0, end: 95 },
  6: { final: 13, start: 30, end: 125 },
  7: { final: 2, start: 30, end: 125 },
  8: { final: 2, start: 30, end: 125 },
  9: { final: 10, start: 15, end: 110 },
  10: { final: 6, start: 0, end: 95 },
  11: { final: 8, start: 60, end: 155 },
  12: { final: 6, start: 15, end: 110 },
  13: { final: 2, start: 15, end: 110 },
  14: { final: 2, start: 30, end: 125 },
  15: { final: 6, start: 30, end: 125 },
};

// Committed deterministic "my entry": a strong, well-captained squad.
const TEST_TEAM = {
  active_chip: null,
  automatic_subs: [],
  entry_history: {
    event: 37,
    points: 0,
    total_points: 2154,
    rank: 0,
    rank_sort: 0,
    overall_rank: PRE_GW_RANK,
    event_transfers: 0,
    event_transfers_cost: 0,
    points_on_bench: 0,
  },
  picks: [
    { element: 1, position: 1, multiplier: 1, is_captain: false, is_vice_captain: false },
    { element: 2, position: 2, multiplier: 1, is_captain: false, is_vice_captain: false },
    { element: 7, position: 3, multiplier: 1, is_captain: false, is_vice_captain: false },
    { element: 15, position: 4, multiplier: 1, is_captain: false, is_vice_captain: false },
    { element: 4, position: 5, multiplier: 1, is_captain: false, is_vice_captain: false },
    { element: 6, position: 6, multiplier: 2, is_captain: true, is_vice_captain: false },
    { element: 10, position: 7, multiplier: 1, is_captain: false, is_vice_captain: false },
    { element: 11, position: 8, multiplier: 1, is_captain: false, is_vice_captain: true },
    { element: 9, position: 9, multiplier: 1, is_captain: false, is_vice_captain: false },
    { element: 12, position: 10, multiplier: 1, is_captain: false, is_vice_captain: false },
    { element: 13, position: 11, multiplier: 1, is_captain: false, is_vice_captain: false },
    { element: 8, position: 12, multiplier: 0, is_captain: false, is_vice_captain: false },
    { element: 3, position: 13, multiplier: 0, is_captain: false, is_vice_captain: false },
    { element: 14, position: 14, multiplier: 0, is_captain: false, is_vice_captain: false },
    { element: 5, position: 15, multiplier: 0, is_captain: false, is_vice_captain: false },
  ],
};

const FORMATIONS = [
  { formation: { def: 3, mid: 4, fwd: 3 }, weight: 6 },
  { formation: { def: 3, mid: 5, fwd: 2 }, weight: 5 },
  { formation: { def: 4, mid: 4, fwd: 2 }, weight: 5 },
  { formation: { def: 4, mid: 3, fwd: 3 }, weight: 4 },
  { formation: { def: 5, mid: 3, fwd: 2 }, weight: 3 },
  { formation: { def: 4, mid: 5, fwd: 1 }, weight: 2 },
  { formation: { def: 5, mid: 4, fwd: 1 }, weight: 2 },
  { formation: { def: 5, mid: 2, fwd: 3 }, weight: 1 },
];

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    const m = a.match(/^--([^=]+)=(.+)$/);
    if (m) out[m[1]] = m[2];
    else if (a.startsWith('--')) out[a.slice(2)] = true;
  }
  return out;
}

function log(msg) {
  process.stdout.write(`[${new Date().toISOString()}] ${msg}\n`);
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeightedIndex(weights, roll) {
  let total = 0;
  for (const w of weights) total += w;
  if (total <= 0) return 0;
  let threshold = roll * total;
  for (let i = 0; i < weights.length; i++) {
    threshold -= weights[i];
    if (threshold < 0) return i;
  }
  return weights.length - 1;
}

function byType(squad, elementType) {
  return squad.filter((p) => p.elementType === elementType);
}

function sampleWithoutReplacement(players, count, rng, weightOf) {
  const pool = [...players];
  const chosen = [];
  const take = Math.min(count, pool.length);
  for (let i = 0; i < take; i++) {
    const weights = pool.map(weightOf);
    const index = pickWeightedIndex(weights, rng());
    const picked = pool[index];
    if (!picked) break;
    chosen.push(picked);
    pool.splice(index, 1);
  }
  return chosen;
}

function startWeight(player) {
  return player.strength + 1;
}

function captainWeight(player) {
  const base = player.strength + 1;
  return base * base;
}

function buildManagerPool({ gw, seed, size, squad, baseEntryId = 1 }) {
  const rng = mulberry32(seed + gw);
  const keepers = byType(squad, 1);
  const defenders = byType(squad, 2);
  const midfielders = byType(squad, 3);
  const forwards = byType(squad, 4);
  const formationWeights = FORMATIONS.map((f) => f.weight);

  const managers = [];
  for (let i = 0; i < size; i++) {
    const keeper = sampleWithoutReplacement(keepers, 1, rng, startWeight)[0];
    const formationEntry = FORMATIONS[pickWeightedIndex(formationWeights, rng())];
    if (!keeper || !formationEntry) continue;
    const { formation } = formationEntry;

    const startingDef = sampleWithoutReplacement(defenders, formation.def, rng, startWeight);
    const startingMid = sampleWithoutReplacement(midfielders, formation.mid, rng, startWeight);
    const startingFwd = sampleWithoutReplacement(forwards, formation.fwd, rng, startWeight);
    const xiPlayers = [keeper, ...startingDef, ...startingMid, ...startingFwd];

    const captainWeights = xiPlayers.map(captainWeight);
    const captain = xiPlayers[pickWeightedIndex(captainWeights, rng())];
    if (!captain) continue;

    managers.push({ id: baseEntryId + i, captain: captain.id, xi: xiPlayers.map((p) => p.id) });
  }

  return { gw, seed, size, squad, managers };
}

function expandManager(manager, squad, gw) {
  const benchIds = squad.map((p) => p.id).filter((id) => !manager.xi.includes(id));
  const picks = [];
  manager.xi.forEach((element, index) => {
    const isCaptain = element === manager.captain;
    picks.push({
      element,
      position: index + 1,
      multiplier: isCaptain ? 2 : 1,
      is_captain: isCaptain,
      is_vice_captain: false,
    });
  });
  benchIds.forEach((element, index) => {
    picks.push({
      element,
      position: 12 + index,
      multiplier: 0,
      is_captain: false,
      is_vice_captain: false,
    });
  });
  return {
    active_chip: null,
    automatic_subs: [],
    entry_history: {
      event: gw,
      points: 0,
      total_points: 0,
      rank: 0,
      rank_sort: 0,
      overall_rank: 0,
      event_transfers: 0,
      event_transfers_cost: 0,
      points_on_bench: 0,
    },
    picks,
  };
}

function calculateLivePoints(picks, liveData, _bootstrap) {
  const liveMap = new Map(liveData.elements.map((e) => [e.id, e]));
  const isBenchBoost = picks.active_chip === 'bboost';
  const isTripleCaptain = picks.active_chip === '3xc';
  const activePicks = isBenchBoost ? picks.picks : picks.picks.filter((p) => p.position <= 11);
  let totalPoints = 0;
  for (const pick of activePicks) {
    const live = liveMap.get(pick.element);
    if (!live) continue;
    let points = live.stats.total_points;
    if (pick.is_captain) points = points * (isTripleCaptain ? 3 : 2);
    totalPoints += points;
  }
  totalPoints -= picks.entry_history.event_transfers_cost;
  return totalPoints;
}

function estimateLiveRank(preGwRank, livePoints, avgEntryScore) {
  const delta = livePoints - avgEntryScore;
  const movement = Math.round(delta * PLACES_PER_POINT);
  const liveRank = Math.max(1, preGwRank - movement);
  return liveRank;
}

function roundTo(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function meanScore(scores) {
  if (scores.length === 0) return 0;
  let total = 0;
  for (const s of scores) total += s;
  return total / scores.length;
}

function clamp01(value) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function pointsAt(playerGw, elapsedMin) {
  const span = playerGw.end - playerGw.start;
  if (span <= 0) return playerGw.final;
  const progress = clamp01((elapsedMin - playerGw.start) / span);
  return Math.round(playerGw.final * progress);
}

function minutesAt(playerGw, elapsedMin) {
  const played = elapsedMin - playerGw.start;
  if (played <= 0) return 0;
  return Math.min(90, Math.round(played));
}

function emptyStats(totalPoints, minutes) {
  return {
    minutes,
    goals_scored: 0,
    assists: 0,
    clean_sheets: 0,
    goals_conceded: 0,
    yellow_cards: 0,
    red_cards: 0,
    saves: 0,
    bonus: 0,
    bps: 0,
    total_points: totalPoints,
  };
}

function buildSampleRecording(gw) {
  const rows = [];
  for (let frame = 0; frame < FRAME_COUNT; frame++) {
    const elapsedMin = frame * FRAME_STEP_MIN;
    const ts = new Date(BASE_TS + elapsedMin * 60_000).toISOString();
    const elements = SAMPLE_SQUAD.map((player) => {
      const playerGw = PLAYER_GW[player.id];
      return {
        id: player.id,
        stats: emptyStats(pointsAt(playerGw, elapsedMin), minutesAt(playerGw, elapsedMin)),
        explain: [],
      };
    });
    rows.push({ ts, gw, data: { elements } });
  }
  return rows;
}

function recordingElapsedSeconds(rows, rowIndex) {
  const first = rows[0];
  const row = rows[rowIndex];
  if (!first || !row) return 0;
  return Math.round((Date.parse(row.ts) - Date.parse(first.ts)) / 1000);
}

function buildExpectedCurve({
  gw,
  rows,
  testTeam,
  distribution,
  bootstrap,
  preGwRank,
  totalManagers,
}) {
  const frames = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const myPoints = calculateLivePoints(testTeam, row.data, bootstrap);
    const poolScores = distribution.managers.map((m) =>
      calculateLivePoints(
        expandManager(m, distribution.squad, distribution.gw),
        row.data,
        bootstrap
      )
    );
    const avgScore = roundTo(meanScore(poolScores), 2);
    const expectedRank = estimateLiveRank(preGwRank, myPoints, avgScore);
    frames.push({
      rowIndex: i,
      elapsedSeconds: recordingElapsedSeconds(rows, i),
      myPoints,
      avgScore,
      expectedRank,
    });
  }
  const lastFrame = frames[frames.length - 1];
  const officialEndRank = lastFrame ? lastFrame.expectedRank : preGwRank;
  return { gw, preGwRank, totalManagers, officialEndRank, frames };
}

function recordingToJsonl(rows) {
  return rows.map((row) => JSON.stringify(row)).join('\n') + '\n';
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

function isRecordingRow(value) {
  if (!value || typeof value !== 'object') return false;
  if (typeof value.ts !== 'string') return false;
  if (typeof value.gw !== 'number') return false;
  if (!value.data || !Array.isArray(value.data.elements)) return false;
  return !Number.isNaN(Date.parse(value.ts));
}

function normaliseRows(rows) {
  return rows.filter(isRecordingRow).sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
}

async function writeBundle(outDir, files) {
  await mkdir(outDir, { recursive: true });
  for (const [name, contents] of Object.entries(files)) {
    const path = resolve(outDir, name);
    await writeFile(path, contents);
    log(`wrote ${path}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const gw = Number(args.gw ?? 37);
  const defaultOut = resolve(
    ROOT,
    `packages/features/src/live-rank/__fixtures__/simulator/gw${gw}`
  );
  const outDir = resolve(ROOT, args.out ?? defaultOut);

  if (args.in) {
    const inPath = resolve(ROOT, args.in);
    log(`normalising real capture ${inPath}`);
    const rawRows = await readJsonl(inPath);
    const rows = normaliseRows(rawRows);
    if (rows.length === 0) throw new Error(`no usable recording rows in ${inPath}`);
    await writeBundle(outDir, {
      'recording.jsonl': recordingToJsonl(rows),
      'meta.json':
        JSON.stringify(
          {
            gw,
            generatedFrom: args.in,
            rows: rows.length,
            note: 'normalised from a real cadence capture; run with --bootstrap to also derive a manager pool + expected curve',
          },
          null,
          2
        ) + '\n',
    });
    log(`normalised ${rows.length} rows -> ${outDir}/recording.jsonl`);
    return;
  }

  log(`building deterministic sample bundle for gw${gw}`);
  const rows = buildSampleRecording(gw);
  const distribution = buildManagerPool({
    gw,
    seed: POOL_SEED,
    size: POOL_SIZE,
    squad: SAMPLE_SQUAD,
  });
  const bootstrap = { elements: [], teams: [], events: [], element_types: [] };
  const curve = buildExpectedCurve({
    gw,
    rows,
    testTeam: TEST_TEAM,
    distribution,
    bootstrap,
    preGwRank: PRE_GW_RANK,
    totalManagers: TOTAL_MANAGERS,
  });

  await writeBundle(outDir, {
    'recording.jsonl': recordingToJsonl(rows),
    'test-team.json': JSON.stringify(TEST_TEAM, null, 2) + '\n',
    'manager-distribution.json': JSON.stringify(distribution, null, 2) + '\n',
    'expected-curve.json': JSON.stringify(curve, null, 2) + '\n',
    'meta.json':
      JSON.stringify(
        {
          gw,
          generatedBy: 'scripts/generate-recording.mjs',
          source: 'deterministic sample over the 15 committed bootstrap players',
          poolSeed: POOL_SEED,
          poolSize: POOL_SIZE,
          preGwRank: PRE_GW_RANK,
          totalManagers: TOTAL_MANAGERS,
          frames: rows.length,
          note: 'real cadence captures live in gitignored var/recordings/gw{N}/recording.jsonl; regenerate with --in once a capture is on disk',
        },
        null,
        2
      ) + '\n',
  });

  log(
    `sample bundle ready: ${rows.length} frames, ${distribution.managers.length} managers, official end rank ${curve.officialEndRank}`
  );
}

main().catch((err) => {
  log(`fatal: ${err.stack ?? err.message}`);
  process.exit(1);
});
