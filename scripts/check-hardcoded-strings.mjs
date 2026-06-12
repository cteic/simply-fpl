#!/usr/bin/env node

/**
 * Scans apps/web and packages/ui JSX/TSX files for hardcoded English copy that
 * should live in packages/i18n/src/locales/en.json.
 *
 * Heuristic: JSX text nodes that contain two or more consecutive letters and
 * are NOT already wrapped in a t() call. False positives are expected — the
 * script only warns, it does not fail the build.
 *
 * Run: node scripts/check-hardcoded-strings.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SCAN_DIRS = ['apps/web/src', 'packages/ui/src'];

const ALLOWLIST = new Set([
  'AI-POWERED',
  'GW',
  'GK',
  'DEF',
  'MID',
  'FWD',
  'TBP',
  'FDR',
  'FPL',
  'Pre',
  'Post',
  'Pro',
  'All',
]);

const JSX_TEXT_RE = />([^<{}\n]+)</g;
const TWO_LETTERS_RE = /[A-Za-z]{2}/;
const T_CALL_RE = /\bt\s*\(/;

let foundCount = 0;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry === 'dist') continue;
      walk(full);
    } else if (full.endsWith('.tsx')) {
      scan(full);
    }
  }
}

function scan(filePath) {
  const src = readFileSync(filePath, 'utf8');
  const lines = src.split('\n');

  lines.forEach((line, idx) => {
    if (T_CALL_RE.test(line)) return;
    if (line.trim().startsWith('//')) return;

    let match;
    JSX_TEXT_RE.lastIndex = 0;
    while ((match = JSX_TEXT_RE.exec(line)) !== null) {
      const text = match[1].trim();
      if (!text) continue;
      if (!TWO_LETTERS_RE.test(text)) continue;
      if (ALLOWLIST.has(text)) continue;
      if (text.startsWith('{') || text.startsWith('$')) continue;

      console.warn(`[i18n-warn] ${filePath}:${idx + 1}: "${text}"`);
      foundCount++;
    }
  });
}

for (const dir of SCAN_DIRS) {
  walk(dir);
}

if (foundCount === 0) {
  console.log('[i18n-warn] No hardcoded strings detected.');
} else {
  console.log(
    `[i18n-warn] Found ${foundCount} potential hardcoded string(s). Review above and extract to en.json or add /* i18n-ignore */ if intentional.`
  );
}
