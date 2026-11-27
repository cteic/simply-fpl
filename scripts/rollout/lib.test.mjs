import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  analyticsQuery,
  evaluateAnalytics,
  evaluateProbes,
  findStaticAsset,
  fullDeployArgs,
  isHealthyStatus,
  parseCanaryPercent,
  parseUploadedVersionId,
  pickStableVersion,
  splitDeployArgs,
  versionOverrideHeader,
} from './lib.mjs';

const A = '6f4078c3-ef08-4a4c-8cd6-f746d72e4783';
const B = '245bcc08-5ed5-4c23-86f1-d1ef7f265b74';

describe('parseUploadedVersionId', () => {
  it('reads the id wrangler prints after an upload', () => {
    const log = `Uploaded simply-fpl (12.3 sec)\nWorker Version ID: ${A}\nVersion Preview URL: https://x.workers.dev`;
    assert.equal(parseUploadedVersionId(log), A);
  });
  it('returns null when the line is missing', () => {
    assert.equal(parseUploadedVersionId('Uploaded simply-fpl'), null);
  });
});

describe('pickStableVersion', () => {
  it('returns the single 100% version', () => {
    const status = { versions: [{ version_id: A, percentage: 100 }] };
    assert.deepEqual(pickStableVersion(status), { versionId: A, split: false });
  });
  it('picks the larger share of a split left by a stopped rollout', () => {
    const status = {
      versions: [
        { version_id: B, percentage: 10 },
        { version_id: A, percentage: 90 },
      ],
    };
    assert.deepEqual(pickStableVersion(status), { versionId: A, split: true });
  });
  it('refuses an even split', () => {
    const status = {
      versions: [
        { version_id: A, percentage: 50 },
        { version_id: B, percentage: 50 },
      ],
    };
    assert.throws(() => pickStableVersion(status), /split evenly/);
  });
  it('refuses a status with no versions', () => {
    assert.throws(() => pickStableVersion({}), /no versions/);
  });
});

describe('splitDeployArgs', () => {
  it('keeps the candidate dark at 0%', () => {
    assert.deepEqual(splitDeployArgs({ candidate: B, stable: A, percent: 0, message: 'dark' }), [
      'versions',
      'deploy',
      `${B}@0%`,
      `${A}@100%`,
      '--yes',
      '--message',
      'dark',
    ]);
  });
  it('splits traffic for a canary', () => {
    const args = splitDeployArgs({ candidate: B, stable: A, percent: 10, message: 'c' });
    assert.deepEqual(args.slice(2, 4), [`${B}@10%`, `${A}@90%`]);
  });
  it('drops the stable version at 100%', () => {
    const args = splitDeployArgs({ candidate: B, stable: A, percent: 100, message: 'p' });
    assert.deepEqual(args.slice(2, 3), [`${B}@100%`]);
    assert.ok(!args.includes(`${A}@0%`));
  });
  it('rejects out-of-range percentages and identical versions', () => {
    assert.throws(() => splitDeployArgs({ candidate: B, stable: A, percent: 101, message: '' }));
    assert.throws(() => splitDeployArgs({ candidate: B, stable: A, percent: 2.5, message: '' }));
    assert.throws(() => splitDeployArgs({ candidate: A, stable: A, percent: 0, message: '' }));
  });
});

describe('fullDeployArgs', () => {
  it('sends 100% to one version without prompting', () => {
    assert.deepEqual(fullDeployArgs({ versionId: A, message: 'm' }), [
      'versions',
      'deploy',
      `${A}@100%`,
      '--yes',
      '--message',
      'm',
    ]);
  });
});

describe('versionOverrideHeader', () => {
  it('uses the structured-header dictionary form', () => {
    assert.deepEqual(versionOverrideHeader('simply-fpl', A), {
      'Cloudflare-Workers-Version-Overrides': `simply-fpl="${A}"`,
    });
  });
});

describe('findStaticAsset', () => {
  it('finds the first Next.js static asset', () => {
    const html =
      '<link href="/_next/static/css/abc.css" rel="stylesheet"><script src="/_next/static/chunks/x.js">';
    assert.equal(findStaticAsset(html), '/_next/static/css/abc.css');
  });
  it('ignores absolute URLs on other origins', () => {
    assert.equal(findStaticAsset('<script src="https://cdn.example/_next/static/a.js">'), null);
  });
});

describe('isHealthyStatus', () => {
  it('passes 2xx and 3xx, fails the rest', () => {
    assert.ok(isHealthyStatus(200));
    assert.ok(isHealthyStatus(307));
    assert.ok(!isHealthyStatus(404));
    assert.ok(!isHealthyStatus(503));
    assert.ok(!isHealthyStatus(0));
  });
});

describe('evaluateProbes', () => {
  const ok = { ok: true };
  const bad = { ok: false };
  it('passes at or under the limit', () => {
    const results = [...Array(49).fill(ok), bad];
    assert.equal(evaluateProbes(results, { maxFailureRate: 0.02 }).pass, true);
  });
  it('fails over the limit', () => {
    const results = [...Array(8).fill(ok), bad, bad];
    assert.equal(evaluateProbes(results, { maxFailureRate: 0.02 }).pass, false);
  });
  it('fails when nothing ran', () => {
    assert.equal(evaluateProbes([], { maxFailureRate: 0.5 }).pass, false);
  });
});

describe('analyticsQuery', () => {
  it('filters by script name and version', () => {
    const q = analyticsQuery({
      accountId: 'acc',
      scriptName: 'simply-fpl',
      versionId: A,
      since: '2026-01-01T00:00:00Z',
      until: '2026-01-01T00:05:00Z',
    });
    assert.equal(q.variables.filter.scriptVersion, A);
    assert.equal(q.variables.filter.scriptName, 'simply-fpl');
    assert.match(q.query, /workersInvocationsAdaptive/);
  });
});

describe('evaluateAnalytics', () => {
  const limits = { maxErrorRate: 0.02, minRequests: 50 };
  const rows = (...pairs) => ({
    data: {
      viewer: {
        accounts: [
          {
            workersInvocationsAdaptive: pairs.map(([requests, errors]) => ({
              sum: { requests, errors },
            })),
          },
        ],
      },
    },
  });

  it('passes a low error rate', () => {
    const v = evaluateAnalytics(rows([500, 2], [100, 1]), limits);
    assert.equal(v.available, true);
    assert.equal(v.pass, true);
    assert.equal(v.requests, 600);
  });
  it('fails a high error rate', () => {
    const v = evaluateAnalytics(rows([100, 10]), limits);
    assert.equal(v.pass, false);
  });
  it('abstains below the minimum request count', () => {
    const v = evaluateAnalytics(rows([10, 10]), limits);
    assert.equal(v.pass, true);
    assert.match(v.reason, /below the 50/);
  });
  it('reports GraphQL errors as unavailable, not as pass or fail', () => {
    const v = evaluateAnalytics({ errors: [{ message: 'not authorized' }] }, limits);
    assert.equal(v.available, false);
    assert.equal(v.pass, undefined);
    assert.match(v.reason, /not authorized/);
  });
  it('reports an unexpected shape as unavailable', () => {
    assert.equal(evaluateAnalytics({ data: {} }, limits).available, false);
    assert.equal(evaluateAnalytics(null, limits).available, false);
  });
});

describe('parseCanaryPercent', () => {
  it('treats empty as 0', () => {
    assert.equal(parseCanaryPercent(undefined), 0);
    assert.equal(parseCanaryPercent(''), 0);
  });
  it('accepts a whole number up to 50', () => {
    assert.equal(parseCanaryPercent('10'), 10);
  });
  it('rejects anything else', () => {
    assert.throws(() => parseCanaryPercent('75'));
    assert.throws(() => parseCanaryPercent('10%'));
    assert.throws(() => parseCanaryPercent('-1'));
  });
});
