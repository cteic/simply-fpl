#!/usr/bin/env node
import { appendFile, mkdir } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const FPL = 'https://fantasy.premierleague.com/api';
const UA = 'SimplyFPL-Cadence-Measurement/0.1 (research; github.com/pete-watters/simply-fpl)';

const CADENCE_MS = {
  match: 5_000,
  pre: 15_000,
  'live-idle': 60_000,
  off: 5 * 60_000,
};

async function fetchJson(path) {
  const res = await fetch(`${FPL}${path}`, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`);
  return res.json();
}

async function sha256Hex(s) {
  const buf = new TextEncoder().encode(s);
  const h = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function isoNow() {
  return new Date().toISOString();
}

function computeState(fixtures) {
  const now = Date.now();
  const inProgress = fixtures.some((f) => {
    if (!f.kickoff_time) return false;
    const ko = Date.parse(f.kickoff_time);
    const elapsed = now - ko;
    return elapsed >= 0 && elapsed <= 130 * 60_000 && !f.finished;
  });
  if (inProgress) return 'match';

  const upcoming = fixtures
    .map((f) => (f.kickoff_time && !f.finished ? Date.parse(f.kickoff_time) - now : Infinity))
    .filter((d) => d > 0)
    .sort((a, b) => a - b);
  if (upcoming.length && upcoming[0] < 30 * 60_000) return 'pre';

  if (fixtures.some((f) => !f.finished)) return 'live-idle';
  return 'off';
}

async function resolveGameweek(arg) {
  const bootstrap = await fetchJson('/bootstrap-static/');
  if (arg) {
    const id = parseInt(arg, 10);
    if (!Number.isFinite(id) || id <= 0) throw new Error(`Bad GW arg: ${arg}`);
    return id;
  }
  const current = bootstrap.events.find((e) => e.is_current);
  const next = bootstrap.events.find((e) => e.is_next);
  const target = current?.id ?? next?.id;
  if (!target) throw new Error('No current or next gameweek in bootstrap-static');
  return target;
}

async function elementHashes(elements) {
  const map = new Map();
  for (const el of elements) {
    map.set(el.id, await sha256Hex(JSON.stringify(el.stats)));
  }
  return map;
}

function diffElements(prev, next) {
  const changed = [];
  for (const [id, h] of next) {
    if (prev.get(id) !== h) changed.push(id);
  }
  return changed;
}

function quantile(sorted, q) {
  if (sorted.length === 0) return null;
  const idx = Math.min(Math.floor(sorted.length * q), sorted.length - 1);
  return sorted[idx];
}

function summarise(changeTimestamps, observations, errors) {
  const lines = [];
  lines.push(`  observations: ${observations}`);
  lines.push(`  changes detected: ${changeTimestamps.length}`);
  lines.push(`  errors: ${errors}`);
  if (changeTimestamps.length > 1) {
    const intervals = changeTimestamps
      .slice(1)
      .map((t, i) => t - changeTimestamps[i])
      .sort((a, b) => a - b);
    const median = quantile(intervals, 0.5);
    const p95 = quantile(intervals, 0.95);
    const min = intervals[0];
    const max = intervals[intervals.length - 1];
    lines.push(
      `  interval between changes (ms): min=${min} median=${median} p95=${p95} max=${max}`
    );
  }
  return lines.join('\n');
}

async function main() {
  const arg = process.argv[2];
  const gw = await resolveGameweek(arg);
  process.stdout.write(
    `Measuring FPL /event/${gw}/live/ — bypassing worker, hitting FPL directly\n`
  );

  const outDir = 'var';
  await mkdir(outDir, { recursive: true });
  const outFile = `${outDir}/fpl-cadence-gw${gw}-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`;
  process.stdout.write(`Logging to ${outFile}\n`);

  let prevBodyHash = '';
  let prevElements = new Map();
  let observations = 0;
  let errors = 0;
  const changeTimestamps = [];

  const onSignal = () => {
    process.stdout.write('\nStopping.\n');
    process.stdout.write(summarise(changeTimestamps, observations, errors) + '\n');
    process.stdout.write(`  output: ${outFile}\n`);
    process.exit(0);
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  let lastFixturesFetch = 0;
  let fixtures = [];

  while (true) {
    const tickStart = Date.now();

    if (tickStart - lastFixturesFetch > 60_000) {
      try {
        fixtures = await fetchJson(`/fixtures/?event=${gw}`);
        lastFixturesFetch = tickStart;
      } catch (e) {
        process.stdout.write(`!! fixtures fetch failed: ${e?.message ?? e}\n`);
      }
    }
    const state = computeState(fixtures);
    const cadenceMs = CADENCE_MS[state];

    let httpStatus = 0;
    let durationMs = 0;
    let bodyText = '';
    let body = null;
    try {
      const t0 = Date.now();
      const res = await fetch(`${FPL}/event/${gw}/live/`, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
      });
      httpStatus = res.status;
      durationMs = Date.now() - t0;
      if (res.ok) {
        bodyText = await res.text();
        body = JSON.parse(bodyText);
      }
    } catch (e) {
      process.stdout.write(`!! live fetch error: ${e?.message ?? e}\n`);
    }

    if (!body) {
      errors += 1;
      await appendFile(
        outFile,
        JSON.stringify({
          ts: isoNow(),
          gw,
          state,
          cadenceMs,
          httpStatus,
          durationMs,
          error: true,
        }) + '\n'
      );
      process.stdout.write(`!! ${isoNow()} [${state}] http=${httpStatus} ${durationMs}ms\n`);
    } else {
      const bodyHash = await sha256Hex(bodyText);
      const elHashes = await elementHashes(body.elements);
      const changed = prevBodyHash === '' ? [] : diffElements(prevElements, elHashes);
      const wasChange = prevBodyHash !== '' && bodyHash !== prevBodyHash;
      if (wasChange) changeTimestamps.push(tickStart);

      observations += 1;
      await appendFile(
        outFile,
        JSON.stringify({
          ts: isoNow(),
          gw,
          state,
          cadenceMs,
          httpStatus,
          durationMs,
          bytes: bodyText.length,
          bodyHash,
          changedCount: changed.length,
          changedSample: changed.slice(0, 8),
          firstObservation: prevBodyHash === '',
        }) + '\n'
      );

      const tag = wasChange ? '🔁' : '  ';
      process.stdout.write(
        `${tag} ${isoNow()} [${state.padEnd(9)}] ${String(durationMs).padStart(4)}ms ${(bodyText.length / 1024).toFixed(1).padStart(6)}KB hash=${bodyHash.slice(0, 8)} changed=${changed.length}\n`
      );

      prevBodyHash = bodyHash;
      prevElements = elHashes;
    }

    if (observations > 0 && observations % 60 === 0) {
      process.stdout.write(
        `-- progress --\n${summarise(changeTimestamps, observations, errors)}\n`
      );
    }

    const elapsed = Date.now() - tickStart;
    const wait = Math.max(cadenceMs - elapsed, 250);
    await sleep(wait);
  }
}

main().catch((err) => {
  process.stdout.write(`fatal: ${err?.stack ?? err}\n`);
  process.exit(1);
});
