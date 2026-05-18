import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

import {
  type BrowserLauncher,
  type BrowserLike,
  type BrowserWorker,
  type PageLike,
} from './measure';
import {
  type SiteTarget,
  type VsBucket,
  type VsBucketPutOptions,
  type VsEnv,
  runComparison,
} from './scheduled';

const TARGETS: SiteTarget[] = [
  { slug: 'simplyfpl', label: 'SimplyFPL', url: 'https://simplyfpl.com/', selector: '#a' },
  { slug: 'livefpl', label: 'livefpl.net', url: 'https://livefpl.net/', selector: '#b' },
];

interface BehaviourMap {
  [url: string]: { totalBytes?: number; fail?: boolean };
}

function makeLauncher(behaviours: BehaviourMap): BrowserLauncher {
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
              const bytes = behaviours[currentUrl]?.totalBytes ?? 100;
              return [{ name: `${currentUrl}main.js`, transferSize: bytes }];
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

interface PutCall {
  key: string;
  value: string | Uint8Array;
}

function makeBucket(initial: Record<string, string> = {}): {
  bucket: VsBucket;
  puts: PutCall[];
} {
  const store: Record<string, string | Uint8Array> = { ...initial };
  const puts: PutCall[] = [];
  const bucket: VsBucket = {
    put: vi.fn(async (key: string, value: string | Uint8Array, _options?: VsBucketPutOptions) => {
      store[key] = value;
      puts.push({ key, value });
      return undefined;
    }),
    get: vi.fn(async (key: string) => {
      const value = store[key];
      if (value === undefined) return null;
      const text = typeof value === 'string' ? value : new TextDecoder().decode(value);
      const buf = typeof value === 'string' ? new TextEncoder().encode(value) : value;
      return {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(buf);
            controller.close();
          },
        }),
        text: async () => text,
      };
    }),
  };
  return { bucket, puts };
}

const NOW = new Date('2026-05-18T06:00:00.000Z');
const BROWSER_BINDING: BrowserWorker = { fetch: vi.fn() };

const feature = await loadFeature('src/vs/speed-comparison.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'Successful weekly run writes both latest and dated snapshots',
    ({ Given, When, Then, And }) => {
      let launcher: BrowserLauncher;
      let bucket: VsBucket;
      let puts: PutCall[];
      let env: VsEnv;

      Given('Browser Rendering returns sensible metrics for both sites', () => {
        launcher = makeLauncher({
          'https://simplyfpl.com/': { totalBytes: 320_000 },
          'https://livefpl.net/': { totalBytes: 1_800_000 },
        });
        const made = makeBucket();
        bucket = made.bucket;
        puts = made.puts;
        env = { BROWSER: BROWSER_BINDING, VS_BUCKET: bucket };
      });

      When('the speed-comparison cron fires on 2026-05-18', async () => {
        await runComparison(env, { now: NOW, targets: TARGETS, launcher });
      });

      Then('R2 contains vs/comparison.json', () => {
        expect(puts.map((p) => p.key)).toContain('vs/comparison.json');
      });

      And('R2 contains vs/2026-W21/comparison.json', () => {
        expect(puts.map((p) => p.key)).toContain('vs/2026-W21/comparison.json');
      });

      And('R2 contains screenshots for both sites under vs/2026-W21/', () => {
        const keys = puts.map((p) => p.key);
        expect(keys).toContain('vs/2026-W21/simplyfpl.jpg');
        expect(keys).toContain('vs/2026-W21/livefpl.jpg');
      });
    }
  );

  Scenario(
    'A failing site preserves the previous snapshot and writes last-error',
    ({ Given, When, Then, And }) => {
      let launcher: BrowserLauncher;
      let bucket: VsBucket;
      let puts: PutCall[];
      let env: VsEnv;
      const previousSnapshot = JSON.stringify({ week: '2026-W20', sites: [] });

      Given('Browser Rendering fails for livefpl', () => {
        launcher = makeLauncher({
          'https://simplyfpl.com/': { totalBytes: 1 },
          'https://livefpl.net/': { fail: true },
        });
        const made = makeBucket({ 'vs/comparison.json': previousSnapshot });
        bucket = made.bucket;
        puts = made.puts;
        env = { BROWSER: BROWSER_BINDING, VS_BUCKET: bucket };
      });

      When('the speed-comparison cron fires on 2026-05-18', async () => {
        await runComparison(env, { now: NOW, targets: TARGETS, launcher });
      });

      Then('R2 contains vs/last-error.json', () => {
        expect(puts.map((p) => p.key)).toContain('vs/last-error.json');
      });

      And('R2 does not overwrite vs/comparison.json', () => {
        const overwrites = puts.filter((p) => p.key === 'vs/comparison.json');
        expect(overwrites).toHaveLength(0);
      });
    }
  );
});
