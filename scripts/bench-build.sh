#!/usr/bin/env bash
# Times a cold and a cached `pnpm build` with hyperfine, then saves a
# `turbo --summarize` report with the time each task took.
#
#   cold    no Turborepo cache and no build output
#   cached  every task restored from the Turborepo cache
#
# The bench uses its own cache directory, so it never reads or clears the cache
# of a normal build. Turborepo otherwise shares one cache across git worktrees.
#
#   BENCH_RUNS   timed runs per case (default 5)
#   BENCH_OUT    results directory (default bench-results)
#   BENCH_CLEAN  build output to delete before each cold run
set -euo pipefail

cd "$(dirname "$0")/.."

RUNS="${BENCH_RUNS:-5}"
OUT="${BENCH_OUT:-bench-results}"
CLEAN="${BENCH_CLEAN:-apps/web/.next apps/web/.tamagui}"

if ! command -v hyperfine >/dev/null; then
  echo "hyperfine is not installed. See https://github.com/sharkdp/hyperfine#installation" >&2
  exit 1
fi

export TURBO_CACHE_DIR="$PWD/.turbo/bench-cache"
mkdir -p "$OUT"

{
  echo "date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "commit: $(git rev-parse --short HEAD)"
  echo "os: $(uname -srm)"
  echo "cpus: $(getconf _NPROCESSORS_ONLN)"
  echo "node: $(node --version)"
  echo "pnpm: $(pnpm --version)"
  echo "hyperfine: $(hyperfine --version)"
  echo "runs: $RUNS"
} | tee "$OUT/machine.txt"

# $CLEAN is a list of paths, so it is left unquoted on purpose.
hyperfine \
  --runs "$RUNS" \
  --prepare "rm -rf '$TURBO_CACHE_DIR' $CLEAN" \
  --command-name 'pnpm build (cold)' \
  --export-json "$OUT/cold.json" \
  --export-markdown "$OUT/cold.md" \
  'pnpm build'

# The last cold run left the cache full, and one warm-up run confirms it.
hyperfine \
  --runs "$RUNS" \
  --warmup 1 \
  --command-name 'pnpm build (cached)' \
  --export-json "$OUT/cached.json" \
  --export-markdown "$OUT/cached.md" \
  'pnpm build'

# One more cold build, for the time per task.
rm -rf "$TURBO_CACHE_DIR" .turbo/runs $CLEAN
pnpm exec turbo run build --summarize >/dev/null
cp .turbo/runs/*.json "$OUT/turbo-summary.json"

rm -rf "$TURBO_CACHE_DIR"

# hyperfine reports the mean. The median is steadier, so work it out from the
# raw runs and save it as summary.json for the CI report.
BENCH_OUT="$OUT" node --input-type=module <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs';

const out = process.env.BENCH_OUT;

function summarise(name) {
  const { results } = JSON.parse(readFileSync(`${out}/${name}.json`, 'utf8'));
  const times = results[0].measurements
    .map((run) => run.time_wall_clock.value)
    .sort((a, b) => a - b);
  const mid = Math.floor(times.length / 2);
  const median = times.length % 2 === 1 ? times[mid] : (times[mid - 1] + times[mid]) / 2;
  return { median, min: times[0], max: times[times.length - 1], runs: times.length };
}

const summary = { cold: summarise('cold'), cached: summarise('cached') };
writeFileSync(`${out}/summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
console.log('');
for (const [name, s] of Object.entries(summary)) {
  console.log(
    `${name}: median ${s.median.toFixed(2)} s, min ${s.min.toFixed(2)} s, max ${s.max.toFixed(2)} s, ${s.runs} runs`
  );
}
NODE
