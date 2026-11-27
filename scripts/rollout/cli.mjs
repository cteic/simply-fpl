#!/usr/bin/env node
// Command-line entry for the production rollout. See docs/deploy-rollout.md.
//
//   node scripts/rollout/cli.mjs stable
//       Print the version currently serving production.
//   node scripts/rollout/cli.mjs parse-upload <log-file>
//       Print the version id from a `wrangler versions upload` log.
//   node scripts/rollout/cli.mjs release --candidate <id> --stable <id>
//       Dark deploy, smoke, optional canary, promote; roll back on failure.
//   node scripts/rollout/cli.mjs rollback --to <id> [--reason <text>]
//       Send 100% of traffic to a named version.
//   node scripts/rollout/cli.mjs smoke --url <base-url> [--version <id>]
//       Run the smoke suite only. Changes nothing.
//
// --dry-run prints each wrangler command that would change traffic instead of
// running it. Read-only wrangler calls and HTTP probes still run.
//
// Environment:
//   ROLLOUT_BASE_URL          public URL to probe (default https://simplyfpl.com)
//   ROLLOUT_WORKER_NAME       Worker name for the override header (default simply-fpl)
//   ROLLOUT_CANARY_PERCENT    0-50; 0 or unset skips the canary stage
//   ROLLOUT_WATCH_SECONDS     canary watch window (default 300)
//   ROLLOUT_SOAK_SECONDS      dark soak window (default 60)
//   ROLLOUT_WRANGLER_CWD      directory holding wrangler.jsonc (default apps/web)
//   CLOUDFLARE_ANALYTICS_TOKEN + CLOUDFLARE_ACCOUNT_ID enable the error-rate gate
//   GITHUB_OUTPUT, GITHUB_STEP_SUMMARY are written when present
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import {
  parseCanaryPercent,
  parseUploadedVersionId,
  pickStableVersion,
  versionOverrideHeader,
} from './lib.mjs';
import { DEFAULTS, runRelease, runRollback, runSmoke } from './release.mjs';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    candidate: { type: 'string' },
    stable: { type: 'string' },
    to: { type: 'string' },
    reason: { type: 'string' },
    url: { type: 'string' },
    version: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
  },
});

const env = process.env;
const dryRun = values['dry-run'];
const wranglerCwd = env.ROLLOUT_WRANGLER_CWD || 'apps/web';
const workerName = env.ROLLOUT_WORKER_NAME || 'simply-fpl';

function intEnv(name, fallback) {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) throw new Error(`${name} must be a non-negative integer`);
  return n;
}

function wranglerRead(args) {
  return execFileSync('pnpm', ['exec', 'wrangler', ...args], {
    cwd: wranglerCwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

async function wranglerWrite(args) {
  if (dryRun) {
    console.log(`[dry-run] would run: wrangler ${args.join(' ')}`);
    return;
  }
  execFileSync('pnpm', ['exec', 'wrangler', ...args], { cwd: wranglerCwd, stdio: 'inherit' });
}

function output(key, value) {
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `${key}=${value}\n`);
}

function stepSummary(lines) {
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
}

function makeDeps(baseUrl) {
  const token = env.CLOUDFLARE_ANALYTICS_TOKEN;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  return {
    baseUrl,
    workerName,
    wrangler: wranglerWrite,
    fetch: globalThis.fetch,
    // In a dry run nothing changes, so there is nothing to wait for.
    sleep: (s) => new Promise((r) => setTimeout(r, dryRun ? 0 : s * 1000)),
    now: () => Date.now(),
    log: (line) => console.log(line),
    analytics: token && accountId ? { token, accountId } : null,
    config: {
      ...DEFAULTS,
      soakSeconds: intEnv('ROLLOUT_SOAK_SECONDS', DEFAULTS.soakSeconds),
      watchSeconds: intEnv('ROLLOUT_WATCH_SECONDS', DEFAULTS.watchSeconds),
      propagationSeconds: intEnv('ROLLOUT_PROPAGATION_SECONDS', DEFAULTS.propagationSeconds),
    },
  };
}

async function main() {
  const [command, ...rest] = positionals;
  const baseUrl = env.ROLLOUT_BASE_URL || 'https://simplyfpl.com';

  switch (command) {
    case 'stable': {
      const status = JSON.parse(wranglerRead(['deployments', 'status', '--json']));
      const { versionId, split } = pickStableVersion(status);
      if (split) {
        console.error(`::warning::production is split; treating ${versionId} as stable`);
      }
      output('version_id', versionId);
      console.log(versionId);
      return 0;
    }

    case 'parse-upload': {
      const id = parseUploadedVersionId(readFileSync(rest[0], 'utf8'));
      if (!id) {
        console.error('::error::no "Worker Version ID" line in the upload log');
        return 1;
      }
      output('version_id', id);
      console.log(id);
      return 0;
    }

    case 'release': {
      const { candidate, stable } = values;
      if (!candidate || !stable) throw new Error('release needs --candidate and --stable');
      const result = await runRelease(makeDeps(baseUrl), {
        candidate,
        stable,
        canaryPercent: parseCanaryPercent(env.ROLLOUT_CANARY_PERCENT),
        sha: (env.GITHUB_SHA || 'local').slice(0, 7),
      });
      let heading = '## Rollout: promoted';
      if (result.rolledBack) heading = '## Rollout: rolled back';
      if (result.rollbackFailed) heading = '## Rollout: rollback FAILED';
      stepSummary([heading, '', ...result.summary.map((l) => `- ${l}`)]);
      output('outcome', result.rolledBack || result.rollbackFailed ? 'rolled_back' : 'promoted');
      if (result.rolledBack || result.rollbackFailed) {
        console.error(
          `::error::${result.summary.find((l) => l.startsWith('ROLLBACK')) ?? 'rolled back'}`
        );
        return 1;
      }
      return 0;
    }

    case 'rollback': {
      if (!values.to) throw new Error('rollback needs --to <version-id>');
      const versionExists = (id) => {
        try {
          return JSON.parse(wranglerRead(['versions', 'view', id, '--json']))?.id === id;
        } catch {
          return false;
        }
      };
      const smoke = await runRollback(makeDeps(baseUrl), {
        target: values.to,
        reason: values.reason,
        versionExists,
      });
      stepSummary([
        `## Rollback to \`${values.to}\``,
        '',
        smoke.pass ? '- Smoke passed.' : `- Smoke FAILED: ${smoke.failures.join(', ')}`,
      ]);
      return smoke.pass ? 0 : 1;
    }

    case 'smoke': {
      const url = values.url || baseUrl;
      const headers = values.version ? versionOverrideHeader(workerName, values.version) : {};
      console.log(
        `Smoke check against ${url}${values.version ? ` pinned to ${values.version}` : ''}:`
      );
      const smoke = await runSmoke(makeDeps(url), { baseUrl: url, headers });
      return smoke.pass ? 0 : 1;
    }

    default:
      console.error(`unknown command "${command ?? ''}"; see the header of this file`);
      return 2;
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`::error::${err?.message ?? err}`);
    process.exit(1);
  }
);
