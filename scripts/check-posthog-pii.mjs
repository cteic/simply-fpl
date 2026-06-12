#!/usr/bin/env node

/**
 * Scans source files for potential PII inside PostHog capture/identify calls.
 *
 * Exits 1 if any match is found.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const SEARCH_PATHS = ['apps/', 'packages/'];
const PII_PATTERNS = [
  /posthog\.capture\s*\([^)]*email/,
  /posthog\.capture\s*\([^)]*\.email/,
  /posthog\.identify\s*\([^)]*email/,
  /posthog\.identify\s*\([^)]*\.email/,
  /posthog\.capture\s*\([^)]*fpl_entry_id/,
  /posthog\.capture\s*\([^)]*entry_id/,
  /posthog\.capture\s*\([^)]*league_id/,
  /posthog\.identify\s*\([^)]*user\.id\b/,
  /posthog\.identify\s*\([^)]*session\.user/,
];

const GREP_PATTERN =
  'posthog\\.(capture|identify|captureException)\\s*\\([^;]{0,300}(email|fpl_entry_id|entry_id|league_id|user\\.email|profile\\.email|session\\.user\\.id)';

let exitCode = 0;

for (const dir of SEARCH_PATHS) {
  if (!existsSync(dir)) continue;

  try {
    const result = execSync(
      `grep -rn --include="*.ts" --include="*.tsx" -E "${GREP_PATTERN}" ${dir}`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();

    if (result) {
      console.error('\n[posthog-pii-check] Potential PII in PostHog calls:\n');
      console.error(result);
      exitCode = 1;
    }
  } catch (err) {
    if (err instanceof Error && 'status' in err && err.status === 1) {
      // grep exits 1 when no matches — that is the desired result
    } else {
      throw err;
    }
  }
}

// Also verify the analytics.ts exports don't hardcode any PII values
const PII_LITERALS = ['pete@', 'fpl_entry_id', 'user.email'];
try {
  for (const literal of PII_LITERALS) {
    const result = execSync(
      `grep -rn --include="*.ts" --include="*.tsx" "${literal}" apps/ packages/`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    if (result) {
      const analyticsOnly = result
        .split('\n')
        .filter(
          (line) =>
            !line.includes('// ') &&
            !line.includes('* ') &&
            !line.includes('.spec.') &&
            !line.includes('.feature') &&
            !line.includes('check-posthog-pii')
        );
      if (analyticsOnly.length > 0) {
        console.error(`\n[posthog-pii-check] Literal "${literal}" found in source:\n`);
        console.error(analyticsOnly.join('\n'));
        exitCode = 1;
      }
    }
  }
} catch (err) {
  if (err instanceof Error && 'status' in err && err.status === 1) {
    // no matches
  } else {
    throw err;
  }
}

if (exitCode === 0) {
  console.log('[posthog-pii-check] No PII patterns found in PostHog calls. ✓');
}

process.exit(exitCode);
