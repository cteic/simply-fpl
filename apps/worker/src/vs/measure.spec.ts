import { describe, expect, it, vi } from 'vitest';

import {
  type BrowserLauncher,
  type BrowserLike,
  type BrowserWorker,
  type MeasureEnv,
  type PageLike,
  measure,
} from './measure';

interface PageOptions {
  resources?: Array<{ name: string; transferSize: number }>;
  selectorAppears?: boolean;
  screenshot?: Uint8Array;
  failOnGoto?: boolean;
}

function makePage(opts: PageOptions = {}): PageLike {
  const resources = opts.resources ?? [];
  const selectorAppears = opts.selectorAppears ?? true;
  const screenshot = opts.screenshot ?? new Uint8Array([0xff, 0xd8, 0xff]);
  return {
    setViewport: vi.fn(async () => undefined),
    setUserAgent: vi.fn(async () => undefined),
    gotoUrl: vi.fn(async () => {
      if (opts.failOnGoto) throw new Error('boom');
    }),
    waitForScript: vi.fn(async () => {
      if (!selectorAppears) {
        throw new Error('TimeoutError: waiting for function failed');
      }
    }),
    evaluateScript: vi.fn(async () => resources),
    screenshotJpeg: vi.fn(async () => screenshot),
  };
}

function makeBrowser(page: PageLike): BrowserLike & { closed: () => boolean } {
  let closed = false;
  return {
    newPage: vi.fn(async () => page),
    close: vi.fn(async () => {
      closed = true;
    }),
    closed: () => closed,
  };
}

function makeLauncher(browser: BrowserLike): BrowserLauncher {
  return { launch: vi.fn(async () => browser) };
}

const env: MeasureEnv = {
  BROWSER: { fetch: vi.fn() } satisfies BrowserWorker,
};

describe('measure', () => {
  it('captures timing, byte total, third-party hostname count, and screenshot bytes', async () => {
    const page = makePage({
      resources: [
        { name: 'https://example.com/main.js', transferSize: 1000 },
        { name: 'https://cdn.example.com/lib.js', transferSize: 500 },
        { name: 'https://cdn.example.com/other.js', transferSize: 200 },
        { name: 'https://ads.thirdparty.net/a.js', transferSize: 300 },
        { name: 'https://tracker.io/t.js', transferSize: 100 },
        { name: 'data:image/png;base64,xxx', transferSize: 50 },
      ],
      screenshot: new Uint8Array([1, 2, 3, 4, 5]),
    });
    const launcher = makeLauncher(makeBrowser(page));

    const result = await measure(env, { url: 'https://example.com/', selector: '#live' }, launcher);

    expect(result.url).toBe('https://example.com/');
    expect(result.timeToFirstData).not.toBeNull();
    expect(result.totalBytes).toBe(1000 + 500 + 200 + 300 + 100);
    expect(result.thirdPartyCount).toBe(3);
    expect(result.screenshotBytes).toBeInstanceOf(Uint8Array);
    expect(result.screenshotBytes.byteLength).toBe(5);
  });

  it('returns timeToFirstData null when selector never appears', async () => {
    const page = makePage({ selectorAppears: false, resources: [] });
    const launcher = makeLauncher(makeBrowser(page));

    const result = await measure(
      env,
      { url: 'https://example.com/', selector: '#missing', timeoutMs: 50 },
      launcher
    );

    expect(result.timeToFirstData).toBeNull();
    expect(result.totalBytes).toBe(0);
    expect(result.thirdPartyCount).toBe(0);
  });

  it('deduplicates third-party hostnames (same host counted once)', async () => {
    const page = makePage({
      resources: [
        { name: 'https://example.com/a.js', transferSize: 1 },
        { name: 'https://cdn.example.com/a.js', transferSize: 1 },
        { name: 'https://cdn.example.com/b.js', transferSize: 1 },
        { name: 'https://cdn.example.com/c.js', transferSize: 1 },
      ],
    });
    const launcher = makeLauncher(makeBrowser(page));

    const result = await measure(env, { url: 'https://example.com/', selector: 'body' }, launcher);

    expect(result.thirdPartyCount).toBe(1);
  });

  it('closes the browser even when measurement throws', async () => {
    const page = makePage({ failOnGoto: true });
    const browser = makeBrowser(page);
    const launcher = makeLauncher(browser);

    await expect(
      measure(env, { url: 'https://example.com/', selector: 'body' }, launcher)
    ).rejects.toThrow('boom');

    expect(browser.closed()).toBe(true);
  });
});
