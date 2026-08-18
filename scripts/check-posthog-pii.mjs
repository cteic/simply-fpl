#!/usr/bin/env node

/**
 * Scans source files for potential PII inside PostHog capture/identify calls.
 *
 * Exits 1 if any match is found.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const SEARCH_PATHS = ['apps/', 'packages/'];

// The literal scan below is deliberately narrower than SEARCH_PATHS. Scanning
// all of apps/ + packages/ for these strings matches the `fpl_entry_id`
// database column and legitimate `user.email` auth reads ~35 times, which is a
// rule that can only be introduced at error level with an empty violation
// list. Restricted to the files that actually talk to PostHog.
const ANALYTICS_PATHS = [
  'apps/web/src/lib/analytics.ts',
  'apps/web/src/components/posthog-provider.tsx',
  'apps/web/src/app/error.tsx',
  'apps/web/src/app/api/analytics',
];
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

// 255, not 300: BSD grep (macOS) rejects intervals above 255 with
// "maximum repetition exceeds 255", which made this crash rather than check.
const GREP_PATTERN =
  'posthog\\.(capture|identify|captureException)\\s*\\([^;]{0,255}(email|fpl_entry_id|entry_id|league_id|user\\.email|profile\\.email|session\\.user\\.id)';

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
const analyticsTargets = ANALYTICS_PATHS.filter((path) => existsSync(path));
try {
  for (const literal of PII_LITERALS) {
    if (analyticsTargets.length === 0) break;
    const result = execSync(
      `grep -rn --include="*.ts" --include="*.tsx" -F "${literal}" ${analyticsTargets.join(' ')}`,
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
