#!/usr/bin/env node
// Full-stack replay runner (RFC 005, issue #173).
//
// Loads a WS2 recording bundle into local Worker KV and starts the worker in
// replay mode so the web UI (or any WS client) can connect to:
//   ws://localhost:8787/live/ws?gw=<gw>&replay=<id>&speed=<speed>
//
// The LiveGwDO loads the recording from KV key `recording:<id>` (see
// apps/worker/src/replay.ts -> loadRecordingText) and emits snapshot/delta
// frames on the replay timeline, so clients can't tell it's a replay.
//
// Usage:
//   node scripts/replay-runner.mjs --gw=37 --id=gw37 --speed=10
//   node scripts/replay-runner.mjs --gw=37 --id=gw37 --dry-run   # validate + print, no wrangler
import { spawn } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const KV_BINDING = 'FPL_CACHE';
const WORKER_DIR = resolve(ROOT, 'apps/worker');

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

function isRecordingRow(value) {
  if (!value || typeof value !== 'object') return false;
  if (typeof value.ts !== 'string') return false;
  if (typeof value.gw !== 'number') return false;
  if (!value.data || !Array.isArray(value.data.elements)) return false;
  return !Number.isNaN(Date.parse(value.ts));
}

function countValidRows(text) {
  let valid = 0;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      if (isRecordingRow(JSON.parse(trimmed))) valid += 1;
    } catch {
      // skip malformed rows, mirrors parseRecording
    }
  }
  return valid;
}

function run(command, args, options) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolvePromise(undefined);
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const gw = Number(args.gw ?? 37);
  const recordingId = String(args.id ?? `gw${gw}`);
  const speed = Number(args.speed ?? 10);
  const dryRun = Boolean(args['dry-run']);
  const bundleDir = resolve(
    ROOT,
    args.bundle ?? `packages/features/src/live-rank/__fixtures__/simulator/gw${gw}`
  );
  const recordingPath = resolve(bundleDir, 'recording.jsonl');

  await access(recordingPath);
  const text = await readFile(recordingPath, 'utf8');
  const validRows = countValidRows(text);
  if (validRows === 0) throw new Error(`no usable recording rows in ${recordingPath}`);

  const kvKey = `recording:${recordingId}`;
  const replayUrl = `ws://localhost:8787/live/ws?gw=${gw}&replay=${recordingId}&speed=${speed}`;

  log(`recording: ${recordingPath} (${validRows} rows)`);
  log(`kv: ${KV_BINDING} ${kvKey}`);
  log(`replay endpoint: ${replayUrl}`);

  if (dryRun) {
    log('dry-run: skipping wrangler. To run for real:');
    log(
      `  wrangler kv key put "${kvKey}" --binding ${KV_BINDING} --path "${recordingPath}" --local`
    );
    log('  wrangler dev');
    return;
  }

  log('seeding local KV…');
  await run(
    'pnpm',
    [
      'exec',
      'wrangler',
      'kv',
      'key',
      'put',
      kvKey,
      '--binding',
      KV_BINDING,
      '--path',
      recordingPath,
      '--local',
    ],
    { cwd: WORKER_DIR }
  );

  log('starting worker in replay mode (ctrl-c to stop)…');
  log(`connect a client to: ${replayUrl}`);
  await run('pnpm', ['exec', 'wrangler', 'dev'], { cwd: WORKER_DIR });
}

main().catch((err) => {
  log(`fatal: ${err.stack ?? err.message}`);
  process.exit(1);
});
