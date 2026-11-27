// Pure decision logic for the production rollout. No I/O lives here, so every
// rule that decides "promote" or "roll back" is covered by lib.test.mjs.
//
// Dependency-free on purpose: it runs in CI from a bare Node install, the same
// as the other scripts in this directory.

export const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

/**
 * Pull the new version id out of `wrangler versions upload` output.
 * Wrangler prints a line like `Worker Version ID: 6f4078c3-...`.
 */
export function parseUploadedVersionId(log) {
  const match = log.match(new RegExp(`Worker Version ID:\\s*(${UUID_RE.source})`, 'i'));
  return match ? match[1] : null;
}

/**
 * Pick the version currently serving traffic from
 * `wrangler deployments status --json`.
 *
 * A healthy production deployment has one version at 100%. A split deployment
 * means an earlier rollout stopped part-way. In that case the version with the
 * larger share is treated as stable, because it is the one most users already
 * run. An even split is ambiguous, so the rollout refuses to guess.
 */
export function pickStableVersion(status) {
  const versions = Array.isArray(status?.versions) ? status.versions : [];
  const valid = versions.filter(
    (v) => typeof v?.version_id === 'string' && typeof v?.percentage === 'number'
  );
  if (valid.length === 0) {
    throw new Error('deployment status lists no versions; cannot find a stable version');
  }
  const sorted = [...valid].sort((a, b) => b.percentage - a.percentage);
  if (sorted.length > 1 && sorted[0].percentage === sorted[1].percentage) {
    throw new Error(
      `deployment is split evenly (${sorted.map((v) => `${v.version_id}@${v.percentage}%`).join(', ')}); ` +
        'resolve it by hand with the rollback workflow first'
    );
  }
  return { versionId: sorted[0].version_id, split: sorted.length > 1 };
}

/**
 * Arguments for `wrangler versions deploy` that send `percent` of traffic to
 * `candidate` and the rest to `stable`. 0 keeps the candidate dark: it gets no
 * user traffic, but requests carrying the version-override header still reach it.
 */
export function splitDeployArgs({ candidate, stable, percent, message }) {
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new Error(`percent must be an integer 0-100, got ${percent}`);
  }
  if (candidate === stable) {
    throw new Error('candidate and stable are the same version');
  }
  const specs =
    percent === 100
      ? [`${candidate}@100%`]
      : [`${candidate}@${percent}%`, `${stable}@${100 - percent}%`];
  return ['versions', 'deploy', ...specs, '--yes', '--message', message];
}

/** Arguments for a single-version 100% deployment (rollback or promote). */
export function fullDeployArgs({ versionId, message }) {
  return ['versions', 'deploy', `${versionId}@100%`, '--yes', '--message', message];
}

/**
 * The header that pins one request to one version of a Worker. It only takes
 * effect while that version is part of the active deployment (0% counts).
 */
export function versionOverrideHeader(workerName, versionId) {
  return { 'Cloudflare-Workers-Version-Overrides': `${workerName}="${versionId}"` };
}

/**
 * First same-origin `/_next/static/` asset referenced by an HTML page. Fetching
 * it pinned to the candidate proves the version's assets were uploaded with it.
 */
export function findStaticAsset(html) {
  const match = html.match(/["'](\/_next\/static\/[^"'?#\s]+)["']/);
  return match ? match[1] : null;
}

/** A probe passes on any 2xx or 3xx. 4xx and 5xx both fail: smoke paths must exist. */
export function isHealthyStatus(status) {
  return Number.isInteger(status) && status >= 200 && status < 400;
}

/**
 * Verdict for the probes fired at the candidate during the watch window.
 * `results` is a list of `{ ok: boolean }`.
 */
export function evaluateProbes(results, { maxFailureRate }) {
  const total = results.length;
  const failed = results.filter((r) => !r.ok).length;
  if (total === 0) {
    return { pass: false, total, failed, reason: 'no probes ran' };
  }
  const rate = failed / total;
  const pass = rate <= maxFailureRate;
  return {
    pass,
    total,
    failed,
    reason: pass
      ? `${failed}/${total} probes failed (limit ${pct(maxFailureRate)})`
      : `${failed}/${total} probes failed, above the ${pct(maxFailureRate)} limit`,
  };
}

/**
 * GraphQL query for one version's invocations since `since`.
 * `scriptVersion` is the per-version filter on `workersInvocationsAdaptive`.
 */
export function analyticsQuery({ accountId, scriptName, versionId, since, until }) {
  return {
    query: `query RolloutHealth($account: String!, $filter: AccountWorkersInvocationsAdaptiveFilter_InputObject!) {
  viewer {
    accounts(filter: { accountTag: $account }) {
      workersInvocationsAdaptive(limit: 100, filter: $filter) {
        sum { requests errors }
        dimensions { status }
      }
    }
  }
}`,
    variables: {
      account: accountId,
      filter: {
        scriptName,
        scriptVersion: versionId,
        datetime_geq: since,
        datetime_leq: until,
      },
    },
  };
}

/**
 * Verdict from a GraphQL analytics response.
 *
 * Returns `{ available: false }` when the response carries no usable data
 * (missing token scope, schema change, API error). The caller decides what an
 * unavailable signal means; this function never turns it into a pass or fail.
 * Below `minRequests` the error rate is noise, so the gate abstains.
 */
export function evaluateAnalytics(response, { maxErrorRate, minRequests }) {
  if (!response || (Array.isArray(response.errors) && response.errors.length > 0)) {
    const detail = response?.errors?.map((e) => e?.message).join('; ') || 'empty response';
    return { available: false, reason: `analytics unavailable: ${detail}` };
  }
  const rows = response?.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive;
  if (!Array.isArray(rows)) {
    return { available: false, reason: 'analytics unavailable: unexpected response shape' };
  }
  let requests = 0;
  let errors = 0;
  for (const row of rows) {
    requests += Number(row?.sum?.requests) || 0;
    errors += Number(row?.sum?.errors) || 0;
  }
  if (requests < minRequests) {
    return {
      available: true,
      pass: true,
      requests,
      errors,
      reason: `${requests} requests, below the ${minRequests} needed to judge an error rate`,
    };
  }
  const rate = errors / requests;
  const pass = rate <= maxErrorRate;
  return {
    available: true,
    pass,
    requests,
    errors,
    reason: `${errors}/${requests} invocations errored (${pct(rate)}, limit ${pct(maxErrorRate)})`,
  };
}

/** Parse the canary percentage from a repo variable. Empty means 0 (dark only). */
export function parseCanaryPercent(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return 0;
  const n = Number(String(raw).trim());
  if (!Number.isInteger(n) || n < 0 || n > 50) {
    throw new Error(`ROLLOUT_CANARY_PERCENT must be an integer 0-50, got "${raw}"`);
  }
  return n;
}

function pct(x) {
  return `${(x * 100).toFixed(1)}%`;
}
