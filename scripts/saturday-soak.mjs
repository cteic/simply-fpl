#!/usr/bin/env node
import { appendFile, mkdir } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const UA = 'SimplyFPL-Soak/0.1 (robustness research; github.com/pete-watters/simply-fpl)';
const INTERVAL_MS = 30_000;
const DURATION_MS = 60 * 60_000;
const TIMEOUT_MS = 10_000;

const TARGETS = [
  'https://simply-fpl.pages.dev/',
  'https://worker.simply-fpl.workers.dev/fpl/bootstrap-static/',
  'https://livefpl.net/',
];

const OUT_DIR = 'var';
const OUT_FILE = `${OUT_DIR}/saturday-soak-2026-05-16.jsonl`;

function isoNow() {
  return new Date().toISOString();
}

async function probe(target) {
  const ts = isoNow();
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(target, {
      headers: { 'User-Agent': UA },
      signal: controller.signal,
    });
    const durationMs = Date.now() - t0;
    clearTimeout(timer);
    const body = await res.text();
    return { ts, target, statusCode: res.status, durationMs, bytes: body.length, body };
  } catch (err) {
    const durationMs = Date.now() - t0;
    clearTimeout(timer);
    return {
      ts,
      target,
      error: err.name === 'AbortError' ? 'timeout' : (err.message ?? String(err)),
      durationMs,
    };
  }
}

function quantile(sorted, q) {
  if (sorted.length === 0) return null;
  return sorted[Math.min(Math.floor(sorted.length * q), sorted.length - 1)];
}

function buildSummary(results) {
  const lines = [];
  for (const target of TARGETS) {
    const rows = results.filter((r) => r.target === target);
    const ok = rows.filter((r) => r.statusCode >= 200 && r.statusCode < 300);
    const nonOk = rows.filter((r) => r.statusCode && !(r.statusCode >= 200 && r.statusCode < 300));
    const errors = rows.filter((r) => r.error);
    const durations = rows
      .filter((r) => r.durationMs)
      .map((r) => r.durationMs)
      .sort((a, b) => a - b);
    const median = quantile(durations, 0.5);
    const p95 = quantile(durations, 0.95);
    lines.push(`${target}`);
    lines.push(
      `  total=${rows.length} 2xx=${ok.length} non2xx=${nonOk.length} errors=${errors.length}`
    );
    lines.push(`  median=${median}ms p95=${p95}ms`);
  }
  return lines.join('\n');
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const startTs = Date.now();
  const endTs = startTs + DURATION_MS;
  const allResults = [];

  process.stdout.write(
    `Soak started at ${isoNow()} — running until ${new Date(endTs).toISOString()}\n`
  );
  process.stdout.write(`Logging to ${OUT_FILE}\n`);

  const onSignal = () => {
    process.stdout.write('\nStopping early.\n');
    process.stdout.write(buildSummary(allResults) + '\n');
    process.exit(0);
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  while (Date.now() < endTs) {
    const tickStart = Date.now();
    const probeResults = await Promise.all(TARGETS.map(probe));

    for (const result of probeResults) {
      const { body: _body, ...logEntry } = result;
      if (result.statusCode && !(result.statusCode >= 200 && result.statusCode < 300)) {
        logEntry.bodyExcerpt = (result.body ?? '').slice(0, 200);
      }
      await appendFile(OUT_FILE, JSON.stringify(logEntry) + '\n');
      allResults.push(result);

      const label = result.error ? `ERR(${result.error})` : `${result.statusCode}`;
      const host = new URL(result.target).hostname.replace('www.', '');
      process.stdout.write(
        `${result.ts} ${host.padEnd(38)} ${label.padEnd(8)} ${result.durationMs}ms\n`
      );
    }

    const elapsed = Date.now() - tickStart;
    const wait = Math.max(INTERVAL_MS - elapsed, 250);
    if (Date.now() + wait < endTs) {
      await sleep(wait);
    } else {
      break;
    }
  }

  process.stdout.write(`\nSoak complete at ${isoNow()}\n`);
  process.stdout.write(buildSummary(allResults) + '\n');

  return allResults;
}

main().catch((err) => {
  process.stdout.write(`fatal: ${err?.stack ?? err}\n`);
  process.exit(1);
});
