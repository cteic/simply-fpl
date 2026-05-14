#!/usr/bin/env node
// Usage: WORKER_URL=https://... COHORT_ADMIN_TOKEN=... node scripts/backfill-cohort.mjs <gw>
// For local wrangler dev: WORKER_URL=http://localhost:8787

const WORKER_URL = process.env.WORKER_URL ?? 'http://localhost:8787';
const TOKEN = process.env.COHORT_ADMIN_TOKEN;
const GW = process.argv[2];

if (!TOKEN || !GW || !/^\d+$/.test(GW)) {
  console.error(
    'Usage: WORKER_URL=... COHORT_ADMIN_TOKEN=... node scripts/backfill-cohort.mjs <gw>'
  );
  process.exit(1);
}

async function runBatch() {
  const res = await fetch(`${WORKER_URL}/cohort/admin/backfill/${GW}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

let iteration = 0;
let done = false;

while (!done) {
  iteration++;
  process.stdout.write(`Batch ${iteration}... `);
  const data = await runBatch();
  const cohorts = data.cohorts ?? {};
  const remaining = Object.entries(cohorts)
    .map(([name, s]) => `${name}: ${s.remaining} remaining`)
    .join(', ');
  console.log(remaining || data.status);
  done = data.status === 'done';
  if (!done) await new Promise((resolve) => setTimeout(resolve, 500));
}

console.log(`GW${GW} backfill complete.`);
