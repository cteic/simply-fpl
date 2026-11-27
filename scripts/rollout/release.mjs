// Orchestration for a production rollout and a manual rollback. Every side
// effect (wrangler, HTTP, sleeping, logging) comes in through `deps`, so the
// whole flow runs against fakes in release.test.mjs.
import {
  analyticsQuery,
  evaluateAnalytics,
  evaluateProbes,
  findStaticAsset,
  fullDeployArgs,
  isHealthyStatus,
  splitDeployArgs,
  UUID_RE,
  versionOverrideHeader,
} from './lib.mjs';

export const DEFAULTS = {
  smokePaths: ['/', '/robots.txt', '/privacy'],
  propagationSeconds: 20,
  soakSeconds: 60,
  watchSeconds: 300,
  probeIntervalSeconds: 15,
  maxProbeFailureRate: 0.02,
  maxErrorRate: 0.02,
  minRequests: 50,
  requestTimeoutMs: 15_000,
  smokeAttempts: 3,
};

/**
 * Fetch one path, optionally pinned to a version. A cache-busting query keeps
 * an edge or browser cache from answering for the version under test.
 */
async function probe(deps, { baseUrl, path, headers }) {
  const url = new URL(path, baseUrl);
  url.searchParams.set('__rollout', String(deps.now()));
  try {
    const res = await deps.fetch(url.toString(), {
      headers: { 'cache-control': 'no-cache', ...headers },
      redirect: 'manual',
      signal: AbortSignal.timeout(deps.config.requestTimeoutMs),
    });
    const body = await res.text();
    return { ok: isHealthyStatus(res.status), status: res.status, body, path };
  } catch (err) {
    return { ok: false, status: 0, body: '', path, error: String(err?.message ?? err) };
  }
}

/**
 * Smoke suite: every path must answer 2xx/3xx, and the first `/_next/static/`
 * asset on the home page must load from the same version. Each path gets a few
 * attempts so a single dropped connection does not trigger a rollback.
 */
export async function runSmoke(deps, { baseUrl, headers = {} }) {
  const { smokePaths, smokeAttempts } = deps.config;
  const failures = [];
  let homeHtml = '';

  const check = async (path) => {
    let last;
    for (let attempt = 1; attempt <= smokeAttempts; attempt++) {
      last = await probe(deps, { baseUrl, path, headers });
      if (last.ok) return last;
      deps.log(`  ${path} attempt ${attempt}: ${last.status || last.error}`);
      if (attempt < smokeAttempts) await deps.sleep(5);
    }
    return last;
  };

  for (const path of smokePaths) {
    const result = await check(path);
    if (path === '/' && result.ok) homeHtml = result.body;
    deps.log(`  ${result.ok ? 'ok  ' : 'FAIL'} ${path} -> ${result.status || result.error}`);
    if (!result.ok) failures.push(`${path} -> ${result.status || result.error}`);
  }

  if (homeHtml) {
    const asset = findStaticAsset(homeHtml);
    if (asset) {
      const result = await check(asset);
      deps.log(`  ${result.ok ? 'ok  ' : 'FAIL'} ${asset} -> ${result.status || result.error}`);
      if (!result.ok) failures.push(`${asset} -> ${result.status || result.error}`);
    } else {
      failures.push('home page references no /_next/static/ asset');
    }
  }

  return { pass: failures.length === 0, failures };
}

/** Probe every smoke path on an interval for `seconds`, then judge the failure rate. */
async function soak(deps, { baseUrl, headers, seconds }) {
  const { probeIntervalSeconds, maxProbeFailureRate } = deps.config;
  const results = [];
  const rounds = Math.max(1, Math.floor(seconds / probeIntervalSeconds));
  for (let i = 0; i < rounds; i++) {
    for (const path of deps.config.smokePaths) {
      results.push(await probe(deps, { baseUrl, path, headers }));
    }
    if (i < rounds - 1) await deps.sleep(probeIntervalSeconds);
  }
  return evaluateProbes(results, { maxFailureRate: maxProbeFailureRate });
}

async function checkAnalytics(deps, { versionId, since }) {
  if (!deps.analytics) {
    return { available: false, reason: 'no analytics token configured' };
  }
  const body = analyticsQuery({
    accountId: deps.analytics.accountId,
    scriptName: deps.workerName,
    versionId,
    since,
    until: new Date(deps.now()).toISOString(),
  });
  let json = null;
  try {
    const res = await deps.fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${deps.analytics.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(deps.config.requestTimeoutMs),
    });
    json = await res.json();
  } catch (err) {
    return { available: false, reason: `analytics request failed: ${err?.message ?? err}` };
  }
  return evaluateAnalytics(json, {
    maxErrorRate: deps.config.maxErrorRate,
    minRequests: deps.config.minRequests,
  });
}

/**
 * Release `candidate` to production, starting from `stable`.
 *
 * 1. Dark: candidate at 0%. Smoke and soak it through the override header.
 * 2. Canary (only when canaryPercent > 0): candidate takes that share of real
 *    traffic. Probe it pinned for the watch window, then read its error rate.
 * 3. Promote: candidate at 100%. Smoke the public URL with no pin.
 *
 * Any failed check sends 100% back to `stable` and returns `rolledBack: true`.
 */
export async function runRelease(deps, { candidate, stable, canaryPercent, sha }) {
  const { log, wrangler, sleep } = deps;
  const pin = versionOverrideHeader(deps.workerName, candidate);
  const summary = [];
  const note = (line) => {
    summary.push(line);
    log(line);
  };

  const deploy = async (args, label) => {
    log(`\n$ wrangler ${args.join(' ')}`);
    await wrangler(args);
    log(`waiting ${deps.config.propagationSeconds}s for ${label} to propagate`);
    await sleep(deps.config.propagationSeconds);
  };

  const rollBack = async (reason) => {
    note(`ROLLBACK: ${reason}`);
    try {
      await deploy(
        fullDeployArgs({
          versionId: stable,
          message: `auto-rollback from ${candidate.slice(0, 8)} (${sha}): ${reason}`.slice(0, 100),
        }),
        'rollback'
      );
      note(`Restored ${stable} at 100%.`);
    } catch (err) {
      note(
        `ROLLBACK FAILED: ${err?.message ?? err}. Production may still route to ${candidate}. ` +
          `Run the "Rollback web" workflow with version ${stable}.`
      );
      return { rolledBack: false, rollbackFailed: true, summary };
    }
    return { rolledBack: true, summary };
  };

  if (candidate === stable) {
    note(`Candidate ${candidate} is already the stable version; nothing to roll out.`);
    return { rolledBack: false, summary };
  }

  note(`Stable: ${stable}`);
  note(`Candidate: ${candidate}`);

  // Stage 1: dark.
  try {
    await deploy(
      splitDeployArgs({ candidate, stable, percent: 0, message: `dark ${sha}` }),
      'dark deploy'
    );
  } catch (err) {
    // A failed deploy call changes nothing, but restore explicitly in case it half-applied.
    return rollBack(`dark deploy failed: ${err?.message ?? err}`);
  }

  log('\nSmoke check (pinned to candidate):');
  const darkSmoke = await runSmoke(deps, { baseUrl: deps.baseUrl, headers: pin });
  if (!darkSmoke.pass) return rollBack(`dark smoke failed: ${darkSmoke.failures.join(', ')}`);
  note('Dark smoke passed.');

  log(`\nSoak (pinned, ${deps.config.soakSeconds}s):`);
  const darkSoak = await soak(deps, {
    baseUrl: deps.baseUrl,
    headers: pin,
    seconds: deps.config.soakSeconds,
  });
  if (!darkSoak.pass) return rollBack(`dark soak failed: ${darkSoak.reason}`);
  note(`Dark soak passed: ${darkSoak.reason}.`);

  // Stage 2: canary.
  if (canaryPercent > 0) {
    const since = new Date(deps.now()).toISOString();
    try {
      await deploy(
        splitDeployArgs({ candidate, stable, percent: canaryPercent, message: `canary ${sha}` }),
        'canary deploy'
      );
    } catch (err) {
      return rollBack(`canary deploy failed: ${err?.message ?? err}`);
    }
    note(`Canary at ${canaryPercent}%.`);

    log(`\nWatch window (pinned, ${deps.config.watchSeconds}s):`);
    const watch = await soak(deps, {
      baseUrl: deps.baseUrl,
      headers: pin,
      seconds: deps.config.watchSeconds,
    });
    if (!watch.pass) return rollBack(`canary probes failed: ${watch.reason}`);
    note(`Canary probes passed: ${watch.reason}.`);

    const analytics = await checkAnalytics(deps, { versionId: candidate, since });
    if (!analytics.available) {
      note(`WARNING: error-rate gate skipped. ${analytics.reason}.`);
    } else if (!analytics.pass) {
      return rollBack(`canary error rate too high: ${analytics.reason}`);
    } else {
      note(`Canary error rate passed: ${analytics.reason}.`);
    }
  } else {
    note('Canary stage skipped (ROLLOUT_CANARY_PERCENT is 0).');
  }

  // Stage 3: promote.
  try {
    await deploy(fullDeployArgs({ versionId: candidate, message: `promote ${sha}` }), 'promotion');
  } catch (err) {
    return rollBack(`promotion failed: ${err?.message ?? err}`);
  }
  note(`Promoted ${candidate} to 100%.`);

  log('\nSmoke check (public, unpinned):');
  const finalSmoke = await runSmoke(deps, { baseUrl: deps.baseUrl });
  if (!finalSmoke.pass)
    return rollBack(`post-promotion smoke failed: ${finalSmoke.failures.join(', ')}`);
  note('Post-promotion smoke passed.');

  return { rolledBack: false, summary };
}

/**
 * Manual rollback: send 100% of traffic to `target`, then smoke the public URL.
 * Refuses an id that is not a version of this Worker, so a typo cannot reach
 * `wrangler versions deploy`. `versionExists` asks Cloudflare by id, because
 * `wrangler versions list` only returns the newest ten and PR previews push the
 * live version off that list within a day.
 */
export async function runRollback(deps, { target, reason, versionExists }) {
  if (!UUID_RE.test(target) || target.match(UUID_RE)[0] !== target) {
    throw new Error(`"${target}" is not a version id`);
  }
  if (!(await versionExists(target))) {
    throw new Error(`version ${target} is not a version of this Worker`);
  }
  const args = fullDeployArgs({
    versionId: target,
    message: `manual rollback: ${reason || 'no reason given'}`.slice(0, 100),
  });
  deps.log(`$ wrangler ${args.join(' ')}`);
  await deps.wrangler(args);
  await deps.sleep(deps.config.propagationSeconds);
  deps.log('\nSmoke check (public, unpinned):');
  return runSmoke(deps, { baseUrl: deps.baseUrl });
}
