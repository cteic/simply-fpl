import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULTS, runRelease, runRollback, runSmoke } from './release.mjs';

const STABLE = '6f4078c3-ef08-4a4c-8cd6-f746d72e4783';
const CANDIDATE = '245bcc08-5ed5-4c23-86f1-d1ef7f265b74';
const HOME = '<html><script src="/_next/static/chunks/main.js"></script></html>';

/**
 * Fake Cloudflare: tracks which version gets traffic, and answers probes from
 * whichever version the override header (or the 100% deployment) selects.
 * `broken` maps a version id to the path it fails on.
 */
function fakeWorld({ broken = {}, analytics = null, failDeployMatching = null } = {}) {
  const deploys = [];
  let live = STABLE;

  const wrangler = async (args) => {
    const joined = args.join(' ');
    if (failDeployMatching && joined.includes(failDeployMatching)) {
      throw new Error('wrangler exploded');
    }
    deploys.push(joined);
    const full = args.find((a) => a.endsWith('@100%'));
    if (full) live = full.split('@')[0];
  };

  const fetch = async (url, init = {}) => {
    if (url.startsWith('https://api.cloudflare.com')) {
      return { json: async () => analytics };
    }
    const pinned = init.headers?.['Cloudflare-Workers-Version-Overrides']?.match(/"(.+)"/)?.[1];
    const version = pinned ?? live;
    const { pathname } = new URL(url);
    const status = broken[version] === pathname ? 500 : 200;
    return { status, text: async () => (pathname === '/' ? HOME : 'ok') };
  };

  const log = [];
  const deps = {
    baseUrl: 'https://simplyfpl.example',
    workerName: 'simply-fpl',
    wrangler,
    fetch,
    sleep: async () => {},
    now: () => Date.parse('2026-01-01T00:00:00Z'),
    log: (l) => log.push(l),
    analytics: analytics ? { token: 't', accountId: 'acc' } : null,
    config: { ...DEFAULTS, soakSeconds: 30, watchSeconds: 30, probeIntervalSeconds: 15 },
  };
  return { deps, deploys, log, live: () => live };
}

const release = (world, canaryPercent = 0) =>
  runRelease(world.deps, { candidate: CANDIDATE, stable: STABLE, canaryPercent, sha: 'abc1234' });

describe('runRelease', () => {
  it('promotes a healthy candidate through dark and public smoke', async () => {
    const world = fakeWorld();
    const result = await release(world);
    assert.equal(result.rolledBack, false);
    assert.equal(world.live(), CANDIDATE);
    assert.equal(world.deploys.length, 2);
    assert.match(world.deploys[0], new RegExp(`${CANDIDATE}@0% ${STABLE}@100%`));
    assert.match(world.deploys[1], new RegExp(`${CANDIDATE}@100%`));
  });

  it('rolls back when the candidate fails dark smoke, before any user sees it', async () => {
    const world = fakeWorld({ broken: { [CANDIDATE]: '/privacy' } });
    const result = await release(world);
    assert.equal(result.rolledBack, true);
    assert.equal(world.live(), STABLE);
    assert.ok(!world.deploys.some((d) => d.includes(`${CANDIDATE}@100%`)));
    assert.ok(!world.deploys.some((d) => /@10%/.test(d)));
    assert.match(result.summary.join('\n'), /dark smoke failed: \/privacy -> 500/);
  });

  it('rolls back when the candidate is missing its static assets', async () => {
    const world = fakeWorld({ broken: { [CANDIDATE]: '/_next/static/chunks/main.js' } });
    const result = await release(world);
    assert.equal(result.rolledBack, true);
    assert.equal(world.live(), STABLE);
  });

  it('runs a canary split when a percentage is set', async () => {
    const world = fakeWorld();
    const result = await release(world, 10);
    assert.equal(result.rolledBack, false);
    assert.ok(world.deploys.some((d) => d.includes(`${CANDIDATE}@10% ${STABLE}@90%`)));
    assert.match(result.summary.join('\n'), /error-rate gate skipped/);
  });

  it('rolls back a canary whose error rate is too high', async () => {
    const analytics = {
      data: {
        viewer: {
          accounts: [{ workersInvocationsAdaptive: [{ sum: { requests: 200, errors: 40 } }] }],
        },
      },
    };
    const world = fakeWorld({ analytics });
    const result = await release(world, 10);
    assert.equal(result.rolledBack, true);
    assert.equal(world.live(), STABLE);
    assert.match(result.summary.join('\n'), /error rate too high/);
  });

  it('promotes a canary whose error rate is low', async () => {
    const analytics = {
      data: {
        viewer: {
          accounts: [{ workersInvocationsAdaptive: [{ sum: { requests: 200, errors: 1 } }] }],
        },
      },
    };
    const world = fakeWorld({ analytics });
    const result = await release(world, 10);
    assert.equal(result.rolledBack, false);
    assert.match(result.summary.join('\n'), /Canary error rate passed/);
  });

  it('rolls back when the promoted version fails public smoke', async () => {
    // Pinned probes pass; the public check after promotion does not.
    const world = fakeWorld();
    const realFetch = world.deps.fetch;
    world.deps.fetch = async (url, init = {}) => {
      const pinned = init.headers?.['Cloudflare-Workers-Version-Overrides'];
      if (!pinned && world.live() === CANDIDATE && new URL(url).pathname === '/robots.txt') {
        return { status: 502, text: async () => '' };
      }
      return realFetch(url, init);
    };
    const result = await release(world);
    assert.equal(result.rolledBack, true);
    assert.equal(world.live(), STABLE);
    assert.match(result.summary.join('\n'), /post-promotion smoke failed/);
  });

  it('reports a failed rollback loudly instead of claiming success', async () => {
    const world = fakeWorld({
      broken: { [CANDIDATE]: '/' },
      failDeployMatching: `${STABLE}@100%`,
    });
    // The dark deploy also names STABLE@100%, so let the first call through.
    let calls = 0;
    const inner = world.deps.wrangler;
    world.deps.wrangler = async (args) => {
      calls += 1;
      if (calls === 1) {
        world.deploys.push(args.join(' '));
        return;
      }
      return inner(args);
    };
    const result = await release(world);
    assert.equal(result.rollbackFailed, true);
    assert.match(result.summary.join('\n'), /ROLLBACK FAILED/);
  });

  it('does nothing when candidate and stable match', async () => {
    const world = fakeWorld();
    const result = await runRelease(world.deps, {
      candidate: STABLE,
      stable: STABLE,
      canaryPercent: 0,
      sha: 'x',
    });
    assert.equal(result.rolledBack, false);
    assert.equal(world.deploys.length, 0);
  });
});

describe('runRollback', () => {
  it('deploys the named version and smokes it', async () => {
    const world = fakeWorld();
    world.deps.wrangler(['versions', 'deploy', `${CANDIDATE}@100%`]);
    const smoke = await runRollback(world.deps, {
      target: STABLE,
      reason: 'bad release',
      versionExists: (id) => [STABLE, CANDIDATE].includes(id),
    });
    assert.equal(smoke.pass, true);
    assert.equal(world.live(), STABLE);
    assert.match(world.deploys.at(-1), /manual rollback: bad release/);
  });

  it('refuses an id that is not a known version', async () => {
    const world = fakeWorld();
    await assert.rejects(
      runRollback(world.deps, {
        target: CANDIDATE,
        reason: '',
        versionExists: (id) => id === STABLE,
      }),
      /not a version of this Worker/
    );
    await assert.rejects(
      runRollback(world.deps, { target: 'latest', reason: '', versionExists: () => true }),
      /not a version id/
    );
    assert.equal(world.deploys.length, 0);
  });
});

describe('runSmoke', () => {
  it('fails when the home page references no static asset', async () => {
    const world = fakeWorld();
    world.deps.fetch = async () => ({ status: 200, text: async () => '<html></html>' });
    const smoke = await runSmoke(world.deps, { baseUrl: 'https://x.example' });
    assert.equal(smoke.pass, false);
    assert.match(smoke.failures.join(), /no \/_next\/static\//);
  });

  it('treats a network error as a failure after retrying', async () => {
    const world = fakeWorld();
    let attempts = 0;
    world.deps.fetch = async () => {
      attempts += 1;
      throw new Error('ECONNRESET');
    };
    const smoke = await runSmoke(world.deps, { baseUrl: 'https://x.example' });
    assert.equal(smoke.pass, false);
    assert.equal(attempts, DEFAULTS.smokePaths.length * DEFAULTS.smokeAttempts);
  });
});
