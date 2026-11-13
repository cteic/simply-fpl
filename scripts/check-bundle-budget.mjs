#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const WEB_DIR = join(REPO_ROOT, 'apps', 'web');
const NEXT_DIR = join(WEB_DIR, '.next');

const BUDGETS = {
  // Measured from prerendered HTML on Next 16.4 (464.6 kB and 450.2 kB
  // locally). CI runs ~3-5 kB higher, so each budget has ~10 kB headroom.
  '/': 475 * 1024,
  '/h2h': 460 * 1024,
};

const KB = 1024;

function formatBytes(bytes) {
  if (bytes < KB) return `${bytes} B`;
  return `${(bytes / KB).toFixed(1)} kB`;
}

function formatDelta(delta) {
  const sign = delta > 0 ? '+' : delta < 0 ? '-' : '';
  const abs = Math.abs(delta);
  if (abs < KB) return `${sign}${abs} B`;
  return `${sign}${(abs / KB).toFixed(1)} kB`;
}

// Next 16 no longer writes app-build-manifest.json, so read the script tags
// from each route's prerendered HTML: that is exactly the JS a first load fetches.
function htmlPathForRoute(route) {
  if (route === '/') return join(NEXT_DIR, 'server', 'app', 'index.html');
  return join(NEXT_DIR, 'server', 'app', `${route.slice(1)}.html`);
}

async function ensureBuild() {
  if (existsSync(NEXT_DIR) && existsSync(join(NEXT_DIR, 'build-manifest.json'))) {
    console.log(`Reusing existing build at ${NEXT_DIR}`);
    return;
  }
  console.log('No .next/ build found — running `next build`…');
  const result = spawnSync('pnpm', ['--filter', '@simplyfpl/web', 'build'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    console.error('next build failed');
    process.exit(result.status ?? 1);
  }
}

async function routeScripts(route) {
  const htmlPath = htmlPathForRoute(route);
  if (!existsSync(htmlPath)) return null;
  const html = await readFile(htmlPath, 'utf8');
  // Skip noModule polyfills: modern browsers never download them.
  return [...html.matchAll(/<script\b[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => !/\bnoModule\b/i.test(tag))
    .map((tag) => tag.match(/src="\/_next\/(static\/[^"]+\.js)"/)?.[1])
    .filter((src) => src !== undefined);
}

async function gzippedSize(relPath) {
  const buf = await readFile(join(NEXT_DIR, relPath));
  return gzipSync(buf).byteLength;
}

async function firstLoadGzipped(route) {
  const scripts = await routeScripts(route);
  if (!scripts || scripts.length === 0) return null;
  const all = Array.from(new Set(scripts));
  let total = 0;
  for (const chunk of all) {
    total += await gzippedSize(chunk);
  }
  return total;
}

async function main() {
  await ensureBuild();

  const rows = [];
  let overBudget = false;
  const missing = [];

  for (const [route, budget] of Object.entries(BUDGETS)) {
    const key = htmlPathForRoute(route);
    const size = await firstLoadGzipped(route);
    if (size == null) {
      missing.push({ route, key });
      continue;
    }
    const delta = size - budget;
    const status = delta <= 0 ? 'PASS' : 'FAIL';
    if (delta > 0) overBudget = true;
    rows.push({ route, size, budget, delta, status });
  }

  console.log('');
  console.log('| Route | First-load JS (gz) | Budget | Delta | Status |');
  console.log('| --- | ---: | ---: | ---: | :---: |');
  for (const r of rows) {
    console.log(
      `| \`${r.route}\` | ${formatBytes(r.size)} | ${formatBytes(r.budget)} | ${formatDelta(r.delta)} | ${r.status} |`
    );
  }
  console.log('');

  if (missing.length > 0) {
    console.warn('Warning: no prerendered HTML found for routes:');
    for (const m of missing) console.warn(`  - ${m.route} (looked for: ${m.key})`);
    console.warn('');
  }

  if (overBudget) {
    console.error('Bundle size budget exceeded.');
    console.error(
      'One or more routes exceed their gzipped first-load JS budget. ' +
        'See the table above for the offending routes.'
    );
    console.error(
      `Budgets are defined in scripts/check-bundle-budget.mjs (BUDGETS). ` +
        `Reduce bundle size (dynamic import, lazy-load, drop deps) or raise the budget there.`
    );
    process.exit(1);
  }

  console.log('All routes within budget.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
