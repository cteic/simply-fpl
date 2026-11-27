#!/usr/bin/env node
// Fails when a migration creates a public table and no migration enables RLS on it.
// Supabase exposes every public table to the anon key through PostgREST unless RLS is on.
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATIONS_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'supabase',
  'migrations'
);

export function tablesMissingRls(sqlFiles) {
  const created = new Set();
  const secured = new Set();
  for (const sql of sqlFiles) {
    for (const m of sql.matchAll(
      /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z_0-9]+)/gi
    )) {
      created.add(m[1].toLowerCase());
    }
    for (const m of sql.matchAll(
      /alter\s+table\s+(?:public\.)?([a-z_0-9]+)\s+enable\s+row\s+level\s+security/gi
    )) {
      secured.add(m[1].toLowerCase());
    }
  }
  return [...created].filter((t) => !secured.has(t)).sort();
}

async function main() {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
  const sql = await Promise.all(files.map((f) => readFile(join(MIGRATIONS_DIR, f), 'utf8')));
  const missing = tablesMissingRls(sql);
  if (missing.length > 0) {
    console.error(`[rls-check] Public tables without row level security: ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log(`[rls-check] All ${files.length} migrations leave public tables with RLS on. ✓`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
