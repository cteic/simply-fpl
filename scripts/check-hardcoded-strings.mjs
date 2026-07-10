#!/usr/bin/env node

/**
 * Non-fatal guard: scan TSX files for JSX text nodes and string attributes
 * that look like user-facing copy. Reports findings but always exits 0.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SCAN_DIRS = ['apps/web/src', 'packages/ui/src'];

const SKIP_PATTERNS = [
  /node_modules/,
  /\.spec\./,
  /\.test\./,
  /\/design\//,
  /\.d\.ts$/,
  /\/app\/og\//,
  /opengraph-image\.tsx$/,
  /\/app\/admin\//,
];

/** Match JSX text containing 2+ consecutive ASCII letters, not inside {…} */
const JSX_TEXT_RE = />[^<{]*[A-Za-z]{2,}[^<{]*</g;

/** Match string literal prop values with 2+ letters: attr="…" or attr='…' */
const STR_ATTR_RE =
  /(?:title|meta|placeholder|label|aria-label)=["'][^"']*[A-Za-z]{2,}[^"'"]*["']/g;

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...walk(full));
    } else if (full.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files;
}

function shouldSkip(filePath) {
  return SKIP_PATTERNS.some((re) => re.test(filePath));
}

function checkFile(filePath) {
  const src = readFileSync(filePath, 'utf-8');
  const hits = [];
  const lines = src.split('\n');

  lines.forEach((line, idx) => {
    if (line.includes('t(')) return;
    const lineNum = idx + 1;

    for (const match of line.matchAll(JSX_TEXT_RE)) {
      const text = match[0].slice(1, -1).trim();
      if (text.length > 1) {
        hits.push({ line: lineNum, text: text.slice(0, 80) });
      }
    }

    for (const match of line.matchAll(STR_ATTR_RE)) {
      hits.push({ line: lineNum, text: match[0].slice(0, 80) });
    }
  });

  return hits;
}

let totalHits = 0;
const cwd = process.cwd();

for (const scanDir of SCAN_DIRS) {
  let files;
  try {
    files = walk(scanDir);
  } catch {
    continue;
  }

  for (const filePath of files) {
    if (shouldSkip(filePath)) continue;
    const hits = checkFile(filePath);
    if (hits.length > 0) {
      const rel = filePath.startsWith(cwd) ? filePath.slice(cwd.length + 1) : filePath;
      for (const hit of hits) {
        console.log(`${rel}:${hit.line} — ${hit.text}`);
        totalHits++;
      }
    }
  }
}

if (totalHits > 0) {
  console.log(
    `\ncheck-hardcoded-strings: ${totalHits} potential hardcoded string(s) found (non-fatal).`
  );
} else {
  console.log('check-hardcoded-strings: no hardcoded strings detected.');
}

process.exit(0);
