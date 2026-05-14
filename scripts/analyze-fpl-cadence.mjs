#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const files = process.argv.slice(2);
if (files.length === 0) {
  process.stderr.write('usage: node scripts/analyze-fpl-cadence.mjs <file.jsonl> [...]\n');
  process.exit(1);
}

function quantile(sorted, q) {
  if (sorted.length === 0) return null;
  const idx = Math.min(Math.floor(sorted.length * q), sorted.length - 1);
  return sorted[idx];
}

function fmt(ms) {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${(ms / 60_000).toFixed(1)} min`;
}

function fmtBytes(b) {
  if (b === null || b === undefined) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

const all = [];
for (const f of files) {
  const text = await readFile(f, 'utf8');
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      all.push({ file: f, ...JSON.parse(line) });
    } catch {
      continue;
    }
  }
}

if (all.length === 0) {
  process.stderr.write('no observations parsed\n');
  process.exit(1);
}

const tsMs = (r) => new Date(r.ts).getTime();
all.sort((a, b) => tsMs(a) - tsMs(b));

const first = all[0];
const last = all[all.length - 1];
const runtimeMs = tsMs(last) - tsMs(first);

const byState = new Map();
let prevHash = '';
let prevTs = 0;

for (const r of all) {
  if (!byState.has(r.state)) {
    byState.set(r.state, {
      observations: 0,
      errors: 0,
      changes: 0,
      changeIntervals: [],
      bytes: [],
      durations: [],
    });
  }
  const bucket = byState.get(r.state);
  bucket.observations += 1;
  if (r.error) bucket.errors += 1;
  if (r.bodyHash) {
    if (prevHash !== '' && r.bodyHash !== prevHash) {
      bucket.changes += 1;
      const interval = tsMs(r) - prevTs;
      bucket.changeIntervals.push(interval);
    }
    prevHash = r.bodyHash;
    prevTs = tsMs(r);
  }
  if (typeof r.bytes === 'number') bucket.bytes.push(r.bytes);
  if (typeof r.durationMs === 'number') bucket.durations.push(r.durationMs);
}

const lines = [];
lines.push('# FPL `/event/live/` cadence — run summary');
lines.push('');
lines.push(`- Observation window: ${first.ts} → ${last.ts} (${fmt(runtimeMs)})`);
lines.push(`- Total observations: ${all.length}`);
lines.push(`- Files: ${files.length}`);
lines.push('');

lines.push('## Cadence by state');
lines.push('');
lines.push(
  '| State | Obs | Errors | Changes | Median Δ | p95 Δ | Max Δ | Avg payload | Avg fetch |'
);
lines.push(
  '| ----- | ---:| ------:| -------:| --------:| -----:| -----:| ----------- | --------- |'
);

const stateOrder = ['off', 'live-idle', 'pre', 'match'];
const states = [...byState.keys()].sort((a, b) => {
  const ai = stateOrder.indexOf(a);
  const bi = stateOrder.indexOf(b);
  return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
});

for (const state of states) {
  const b = byState.get(state);
  const sorted = [...b.changeIntervals].sort((x, y) => x - y);
  const median = quantile(sorted, 0.5);
  const p95 = quantile(sorted, 0.95);
  const max = sorted.length ? sorted[sorted.length - 1] : null;
  const avgBytes = b.bytes.length
    ? Math.round(b.bytes.reduce((s, x) => s + x, 0) / b.bytes.length)
    : null;
  const avgDuration = b.durations.length
    ? Math.round(b.durations.reduce((s, x) => s + x, 0) / b.durations.length)
    : null;
  lines.push(
    `| ${state} | ${b.observations} | ${b.errors} | ${b.changes} | ${fmt(median)} | ${fmt(p95)} | ${fmt(max)} | ${fmtBytes(avgBytes)} | ${fmt(avgDuration)} |`
  );
}

lines.push('');
lines.push('## Implications for RFC 001 cadence');
lines.push('');
lines.push('Replace the placeholder cadences in RFC 001 §6 with these observed numbers:');
lines.push('');

for (const state of ['match', 'pre', 'live-idle', 'off']) {
  const b = byState.get(state);
  if (!b || b.changeIntervals.length === 0) {
    lines.push(`- **${state}**: insufficient data — keep RFC 001 default.`);
    continue;
  }
  const sorted = [...b.changeIntervals].sort((x, y) => x - y);
  const median = quantile(sorted, 0.5);
  const p95 = quantile(sorted, 0.95);
  const rec = Math.max(1000, Math.floor((median ?? 0) / 2 / 1000) * 1000);
  lines.push(
    `- **${state}**: observed median Δ ${fmt(median)}, p95 ${fmt(p95)}. Recommended DO poll cadence: ${fmt(rec)} (≈ half of median to catch ~95% of changes within one cycle).`
  );
}

lines.push('');
lines.push('## Issues to investigate');
lines.push('');

let totalErrors = 0;
for (const b of byState.values()) totalErrors += b.errors;
if (totalErrors > 0) {
  lines.push(
    `- **${totalErrors} fetch errors** observed. Check JSONL for \`error: true\` rows — most likely rate-limit signals from FPL.`
  );
} else {
  lines.push('- No fetch errors. FPL did not rate-limit at the cadences we used.');
}

const payloadSamples = all.filter((r) => typeof r.bytes === 'number').map((r) => r.bytes);
if (payloadSamples.length > 5) {
  const minB = Math.min(...payloadSamples);
  const maxB = Math.max(...payloadSamples);
  const growth = ((maxB - minB) / minB) * 100;
  lines.push(
    `- Payload size range: ${fmtBytes(minB)} → ${fmtBytes(maxB)} (${growth.toFixed(0)}% growth across run). Larger payloads = more \`explain\` data accumulated.`
  );
}

lines.push('');
lines.push('## Next experiments');
lines.push('');
lines.push(
  '- Run across the full GW37 weekend (multiple parallel fixtures) — cadence profile differs when many matches overlap.'
);
lines.push(
  '- Compare worker KV mirror staleness vs DO live snapshot (post-LF-04) — proves the fan-out value.'
);
lines.push(
  '- Capture a sample observation when a goal is scored (manually note timestamp) to measure FPL ingestion lag.'
);

process.stdout.write(lines.join('\n') + '\n');
