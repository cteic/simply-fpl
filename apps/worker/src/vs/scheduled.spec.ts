import { describe, expect, it, vi } from 'vitest';

import {
  type BrowserLauncher,
  type BrowserLike,
  type BrowserWorker,
  type PageLike,
} from './measure';
import {
  type ComparisonSnapshot,
  type SiteTarget,
  type VsBucket,
  type VsBucketPutOptions,
  type VsEnv,
  runComparison,
} from './scheduled';

interface PutCall {
  key: string;
  value: string | Uint8Array;
  contentType: string | undefined;
}

function makeBucket(): { bucket: VsBucket; puts: PutCall[]; gets: string[] } {
  const puts: PutCall[] = [];
  const gets: string[] = [];
  const bucket: VsBucket = {
    put: vi.fn(async (key: string, value: string | Uint8Array, options?: VsBucketPutOptions) => {
      puts.push({ key, value, contentType: options?.httpMetadata?.contentType });
      return undefined;
    }),
    get: vi.fn(async (key: string) => {
      gets.push(key);
      return null;
    }),
  };
  return { bucket, puts, gets };
}

const TARGETS: SiteTarget[] = [
  {
    slug: 'simplyfpl',
    label: 'SimplyFPL',
    url: 'https://simplyfpl.com/',
    selector: '#a',
  },
  {
    slug: 'livefpl',
    label: 'livefpl.net',
    url: 'https://livefpl.net/',
    selector: '#b',
  },
];

interface FakeMeasureBehaviour {
  totalBytes?: number;
  thirdPartyCount?: number;
  fail?: boolean;
}

function makeLauncher(behaviours: Record<string, FakeMeasureBehaviour>): BrowserLauncher {
  return {
    launch: vi.fn(async () => {
      const browser: BrowserLike = {
        newPage: vi.fn(async () => {
          let currentUrl = '';
          const page: PageLike = {
            setViewport: vi.fn(async () => undefined),
            setUserAgent: vi.fn(async () => undefined),
            gotoUrl: vi.fn(async (url: string) => {
              currentUrl = url;
              const behaviour = behaviours[url] ?? {};
              if (behaviour.fail) throw new Error('navigation failed');
            }),
            waitForScript: vi.fn(async () => undefined),
            evaluateScript: vi.fn(async () => {
              const behaviour = behaviours[currentUrl] ?? {};
              const bytes = behaviour.totalBytes ?? 0;
              const thirdParty = behaviour.thirdPartyCount ?? 0;
              const entries: Array<{ name: string; transferSize: number }> = [];
              if (bytes > 0) {
                entries.push({ name: `${currentUrl}main.js`, transferSize: bytes });
              }
              for (let i = 0; i < thirdParty; i += 1) {
                entries.push({ name: `https://third-${i}.example/x.js`, transferSize: 1 });
              }
              return entries;
            }),
            screenshotJpeg: vi.fn(async () => new Uint8Array([1, 2, 3])),
          };
          return page;
        }),
        close: vi.fn(async () => undefined),
      };
      return browser;
    }),
  };
}

const NOW = new Date('2026-05-18T06:00:00.000Z');

function makeBrowserBinding(): BrowserWorker {
  return { fetch: vi.fn() };
}

describe('runComparison', () => {
  it('writes screenshots, latest JSON, and history JSON in the expected R2 keys', async () => {
    const { bucket, puts } = makeBucket();
    const env: VsEnv = {
      BROWSER: makeBrowserBinding(),
      VS_BUCKET: bucket,
    };
    const launcher = makeLauncher({
      'https://simplyfpl.com/': { totalBytes: 320_000, thirdPartyCount: 2 },
      'https://livefpl.net/': { totalBytes: 1_800_000, thirdPartyCount: 12 },
    });

    const result = await runComparison(env, { now: NOW, targets: TARGETS, launcher });

    if (!('sites' in result)) throw new Error('expected success snapshot');
    const snapshot: ComparisonSnapshot = result;
    expect(snapshot.week).toBe('2026-W21');
    expect(snapshot.measuredAt).toBe(NOW.toISOString());
    expect(snapshot.sites).toHaveLength(2);
    expect(snapshot.sites[0]?.slug).toBe('simplyfpl');
    expect(snapshot.sites[0]?.screenshotKey).toBe('vs/2026-W21/simplyfpl.jpg');
    expect(snapshot.sites[1]?.slug).toBe('livefpl');

    const keys = puts.map((p) => p.key);
    expect(keys).toContain('vs/2026-W21/simplyfpl.jpg');
    expect(keys).toContain('vs/2026-W21/livefpl.jpg');
    expect(keys).toContain('vs/comparison.json');
    expect(keys).toContain('vs/2026-W21/comparison.json');

    const latest = puts.find((p) => p.key === 'vs/comparison.json');
    expect(latest?.contentType).toBe('application/json');
    if (typeof latest?.value !== 'string') throw new Error('expected JSON string body');
    const parsed: ComparisonSnapshot = JSON.parse(latest.value);
    expect(parsed.sites).toHaveLength(2);
  });

  it('writes vs/last-error.json on failure and does not overwrite vs/comparison.json', async () => {
    const { bucket, puts } = makeBucket();
    const env: VsEnv = {
      BROWSER: makeBrowserBinding(),
      VS_BUCKET: bucket,
    };
    const launcher = makeLauncher({
      'https://simplyfpl.com/': { totalBytes: 1, thirdPartyCount: 0 },
      'https://livefpl.net/': { fail: true },
    });

    const result = await runComparison(env, { now: NOW, targets: TARGETS, launcher });

    const keys = puts.map((p) => p.key);
    expect(keys).toContain('vs/last-error.json');
    expect(keys).not.toContain('vs/comparison.json');
    expect(keys).not.toContain('vs/2026-W21/comparison.json');
    if (!('failedSlug' in result)) throw new Error('expected error record');
    expect(result.failedSlug).toBe('livefpl');
  });
});
