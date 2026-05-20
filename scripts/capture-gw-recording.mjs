#!/usr/bin/env node
import { appendFile, mkdir } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const FPL = 'https://fantasy.premierleague.com/api';
const UA = 'SimplyFPL-Recording-Capture/0.1 (research; github.com/pete-watters/simply-fpl)';

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
    const elapsed = now - Date.parse(f.kickoff_time);
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
  if (arg) {
    const id = parseInt(arg, 10);
    if (!Number.isFinite(id) || id <= 0) throw new Error(`Bad GW arg: ${arg}`);
    return id;
  }
  const bootstrap = await fetchJson('/bootstrap-static/');
  const current = bootstrap.events.find((e) => e.is_current);
  const next = bootstrap.events.find((e) => e.is_next);
  const target = current?.id ?? next?.id;
  if (!target) throw new Error('No current or next gameweek in bootstrap-static');
  return target;
}

async function main() {
  const gw = await resolveGameweek(process.env['GW'] ?? process.argv[2]);
  const maxMs = process.env['MAX_MINUTES'] ? Number(process.env['MAX_MINUTES']) * 60_000 : null;

  const outDir = 'var/recordings';
  await mkdir(outDir, { recursive: true });
  const outFile = process.env['OUT'] ?? `${outDir}/gw${gw}.jsonl`;
  process.stdout.write(`Capturing FPL /event/${gw}/live/ as ReplayRow JSONL → ${outFile}\n`);

  let prevBodyHash = '';
  let rowsWritten = 0;
  let errors = 0;
  const startedAt = Date.now();

  const onSignal = () => {
    process.stdout.write(`\nStopping. rows=${rowsWritten} errors=${errors} → ${outFile}\n`);
    process.exit(0);
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  let lastFixturesFetch = 0;
  let fixtures = [];

  while (true) {
    const tickStart = Date.now();
    if (maxMs !== null && tickStart - startedAt > maxMs) {
      process.stdout.write(`Reached MAX_MINUTES. rows=${rowsWritten} → ${outFile}\n`);
      return;
    }

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

    let body = null;
    let bodyText = '';
    try {
      const res = await fetch(`${FPL}/event/${gw}/live/`, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
      });
      if (res.ok) {
        bodyText = await res.text();
        body = JSON.parse(bodyText);
      }
    } catch (e) {
      process.stdout.write(`!! live fetch error: ${e?.message ?? e}\n`);
    }

    if (!body || !Array.isArray(body.elements)) {
      errors += 1;
    } else {
      const bodyHash = await sha256Hex(bodyText);
      const changed = prevBodyHash === '' || bodyHash !== prevBodyHash;
      if (changed) {
        await appendFile(outFile, JSON.stringify({ ts: isoNow(), gw, data: body }) + '\n');
        rowsWritten += 1;
        process.stdout.write(
          `🔴 ${isoNow()} [${state.padEnd(9)}] rows=${rowsWritten} bytes=${(bodyText.length / 1024).toFixed(1)}KB\n`
        );
        prevBodyHash = bodyHash;
      } else {
        process.stdout.write(`   ${isoNow()} [${state.padEnd(9)}] no change\n`);
      }
    }

    const wait = Math.max(cadenceMs - (Date.now() - tickStart), 250);
    await sleep(wait);
  }
}

main().catch((err) => {
  process.stdout.write(`fatal: ${err?.stack ?? err}\n`);
  process.exit(1);
});
