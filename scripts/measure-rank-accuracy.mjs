#!/usr/bin/env node
// Measure how wrong the shipping flat-700 live-rank heuristic is against the
// committed season archive (RFC 006 Phase 1).
//
// Pure offline replay: reads `var/season-archive/<season>/` off disk, runs the
// real `estimateLiveRank` from @simplyfpl/fpl-client over every eligible
// (entry, gameweek) pair, and reports the error metrics — median absolute
// error, signed bias, and a per-true-rank-band breakdown — for BOTH the gross
// gameweek score and the net (post-transfer-hit) score, so we can see which
// tracks reality better. No network, no build step (Node strips the TS types
// on import).
//
// Requires Node >= 22.15 (uses module.registerHooks and native TS import).
// The CI regression gate is the co-located Vitest spec
// (packages/fpl-client/src/rank-accuracy/replay-archive.spec.ts), which runs
// under Vitest's transform pipeline and needs no special Node version — this
// script is the human-readable report runner.
//
// Usage:
//   node scripts/measure-rank-accuracy.mjs
//   node scripts/measure-rank-accuracy.mjs --season=2025-26 --league=936326
//   node scripts/measure-rank-accuracy.mjs --no-write   (skip the JSON report)
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import * as nodeModule from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (typeof nodeModule.registerHooks !== 'function') {
  process.stderr.write(
    'This script needs Node >= 22.15 (module.registerHooks). ' +
      `Current: ${process.version}. The CI gate (replay-archive.spec.ts) runs everywhere.\n`
  );
  process.exit(1);
}

// The fpl-client source uses extensionless relative imports (moduleResolution:
// bundler). Node's native TS support strips types but does not resolve those
// bare specifiers, so register a tiny resolve hook that appends `.ts` when the
// extensionless target exists. This keeps the harness a plain `node` script
// with no build step and no extra dependency.
nodeModule.registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      !/\.[a-z]+$/.test(specifier)
    ) {
      const parentPath = context.parentURL ? fileURLToPath(context.parentURL) : process.cwd();
      const candidate = join(dirname(parentPath), `${specifier}.ts`);
      if (existsSync(candidate)) {
        return nextResolve(`${specifier}.ts`, context);
      }
    }
    return nextResolve(specifier, context);
  },
});

const { loadArchive } = await import('../packages/fpl-client/src/rank-accuracy/archive-reader.ts');
const { replayArchive } =
  await import('../packages/fpl-client/src/rank-accuracy/replay-archive.ts');

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const ARCHIVE_ROOT = join(REPO_ROOT, 'var', 'season-archive');

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)(?:=(.+))?$/);
    if (match) out[match[1]] = match[2] ?? true;
  }
  return out;
}

function fmtRank(value) {
  if (!Number.isFinite(value)) return '—';
  return Math.round(value).toLocaleString('en-US');
}

function fmtPct(value) {
  if (!Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function fmtSigned(value) {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value);
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toLocaleString('en-US')}`;
}

function pad(value, width) {
  const str = String(value);
  return str.length >= width ? str : ' '.repeat(width - str.length) + str;
}

function padRight(value, width) {
  const str = String(value);
  return str.length >= width ? str : str + ' '.repeat(width - str.length);
}

function printResult(result) {
  process.stdout.write(`\n=== points mode: ${result.pointsMode.toUpperCase()} ===\n`);
  process.stdout.write(`scored pairs: ${result.count}\n`);
  process.stdout.write(`median abs error:      ${fmtRank(result.medianAbsError)} ranks\n`);
  process.stdout.write(`median abs % error:    ${fmtPct(result.medianAbsPctError)}\n`);
  process.stdout.write(
    `mean signed error:     ${fmtSigned(result.meanSignedError)} ranks (bias)\n`
  );
  process.stdout.write(`median signed error:   ${fmtSigned(result.medianSignedError)} ranks\n`);
  process.stdout.write(`median signed % error: ${fmtPct(result.medianSignedPctError)}\n`);

  const header = [
    padRight('true-rank band', 14),
    pad('n', 5),
    pad('med |err|', 12),
    pad('med |err|%', 11),
    pad('med signed', 13),
    pad('signed %', 10),
  ].join('  ');
  process.stdout.write(`\n${header}\n`);
  process.stdout.write(`${'-'.repeat(header.length)}\n`);
  for (const band of result.bands) {
    if (band.count === 0) continue;
    const row = [
      padRight(band.band, 14),
      pad(band.count, 5),
      pad(fmtRank(band.medianAbsError), 12),
      pad(fmtPct(band.medianAbsPctError), 11),
      pad(fmtSigned(band.medianSignedError), 13),
      pad(fmtPct(band.medianSignedPctError), 10),
    ].join('  ');
    process.stdout.write(`${row}\n`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const season = typeof args.season === 'string' ? args.season : '2025-26';
  const leagueId = args.league ? Number(args.league) : 936326;

  process.stdout.write(`Loading archive: ${join(ARCHIVE_ROOT, season)} (league ${leagueId})\n`);
  const archive = loadArchive(ARCHIVE_ROOT, { season, leagueId });
  process.stdout.write(
    `Loaded ${archive.entries.length} entries, total_players=${archive.bootstrap.totalPlayers.toLocaleString('en-US')}\n`
  );

  const net = replayArchive(archive.entries, archive.bootstrap, 'net');
  const gross = replayArchive(archive.entries, archive.bootstrap, 'gross');

  printResult(net);
  printResult(gross);

  const better =
    net.medianAbsError <= gross.medianAbsError ? 'net (points - transfer hit)' : 'gross (points)';
  process.stdout.write(
    `\nLower overall median abs error: ${better}` +
      ` (net ${fmtRank(net.medianAbsError)} vs gross ${fmtRank(gross.medianAbsError)})\n`
  );

  if (args.write === false || args['no-write']) {
    process.stdout.write('\n--no-write: skipping JSON report\n');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = join(REPO_ROOT, 'var', 'rank-accuracy');
  const outFile = join(outDir, `${timestamp}.json`);
  await mkdir(outDir, { recursive: true });
  await writeFile(
    outFile,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        season,
        leagueId,
        entries: archive.entries.length,
        totalPlayers: archive.bootstrap.totalPlayers,
        results: { net, gross },
      },
      replacer,
      2
    )}\n`
  );
  process.stdout.write(`\nWrote ${outFile}\n`);
}

function replacer(_key, value) {
  if (value === Number.POSITIVE_INFINITY) return 'Infinity';
  return value;
}

main().catch((err) => {
  process.stderr.write(`${err.stack ?? err}\n`);
  process.exit(1);
});
