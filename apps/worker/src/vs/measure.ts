import puppeteer, { type BrowserWorker } from '@cloudflare/puppeteer';

export { type BrowserWorker };

export interface MeasureEnv {
  BROWSER: BrowserWorker;
}

export interface MeasureResult {
  url: string;
  timeToFirstData: number | null;
  totalBytes: number;
  thirdPartyCount: number;
  screenshotBytes: Uint8Array;
}

export interface MeasureOptions {
  url: string;
  selector: string;
  timeoutMs?: number;
  userAgent?: string;
}

export interface PageLike {
  setViewport(viewport: { width: number; height: number }): Promise<unknown>;
  setUserAgent(userAgent: string): Promise<unknown>;
  gotoUrl(url: string, timeoutMs: number): Promise<unknown>;
  waitForScript(script: string, timeoutMs: number): Promise<unknown>;
  evaluateScript(script: string): Promise<unknown>;
  screenshotJpeg(quality: number): Promise<Uint8Array>;
}

export interface BrowserLike {
  newPage(): Promise<PageLike>;
  close(): Promise<unknown>;
}

export interface BrowserLauncher {
  launch(endpoint: BrowserWorker): Promise<BrowserLike>;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const VIEWPORT = { width: 1280, height: 800 } as const;
const SCREENSHOT_QUALITY = 60;

interface ResourceEntry {
  name: string;
  transferSize: number;
}

function hostnameOf(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function countThirdPartyHosts(resources: ResourceEntry[], pageUrl: string): number {
  const pageHost = hostnameOf(pageUrl);
  if (!pageHost) return 0;
  const hosts = new Set<string>();
  for (const entry of resources) {
    const host = hostnameOf(entry.name);
    if (!host) continue;
    if (host === pageHost) continue;
    hosts.add(host);
  }
  return hosts.size;
}

function sumBytes(resources: ResourceEntry[]): number {
  let total = 0;
  for (const entry of resources) {
    if (!hostnameOf(entry.name)) continue;
    if (typeof entry.transferSize === 'number' && entry.transferSize > 0) {
      total += entry.transferSize;
    }
  }
  return total;
}

function isResourceEntry(value: unknown): value is ResourceEntry {
  if (!value || typeof value !== 'object') return false;
  const record: Record<string, unknown> = { ...value };
  return typeof record.name === 'string' && typeof record.transferSize === 'number';
}

function normaliseResources(value: unknown): ResourceEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isResourceEntry);
}

interface RunOnPageDeps {
  page: PageLike;
  url: string;
  selector: string;
  timeoutMs: number;
}

export async function runOnPage({
  page,
  url,
  selector,
  timeoutMs,
}: RunOnPageDeps): Promise<MeasureResult> {
  await page.setViewport(VIEWPORT);
  const navStart = Date.now();
  await page.gotoUrl(url, timeoutMs);

  let timeToFirstData: number | null = null;
  try {
    const waitScript = `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      const text = (el.textContent || '').trim();
      return text.length > 0;
    })()`;
    await page.waitForScript(waitScript, timeoutMs);
    timeToFirstData = Date.now() - navStart;
  } catch {
    timeToFirstData = null;
  }

  const resourceScript = `(() => {
    const entries = performance.getEntriesByType('resource');
    return entries.map((entry) => ({ name: entry.name, transferSize: entry.transferSize }));
  })()`;
  const evaluated = await page.evaluateScript(resourceScript);
  const resources = normaliseResources(evaluated);

  const screenshot = await page.screenshotJpeg(SCREENSHOT_QUALITY);
  const screenshotBytes = Uint8Array.from(screenshot);

  return {
    url,
    timeToFirstData,
    totalBytes: sumBytes(resources),
    thirdPartyCount: countThirdPartyHosts(resources, url),
    screenshotBytes,
  };
}

function adaptPage(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof puppeteer.launch>>['newPage']>>
): PageLike {
  return {
    setViewport: (viewport) => page.setViewport(viewport),
    setUserAgent: (userAgent) => page.setUserAgent(userAgent),
    gotoUrl: (url, timeoutMs) =>
      page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs }),
    waitForScript: (script, timeoutMs) => page.waitForFunction(script, { timeout: timeoutMs }),
    evaluateScript: (script) => page.evaluate(script),
    screenshotJpeg: async (quality) => {
      const buf = await page.screenshot({ type: 'jpeg', quality, fullPage: false });
      return Uint8Array.from(buf);
    },
  };
}

export const defaultLauncher: BrowserLauncher = {
  launch: async (endpoint) => {
    const browser = await puppeteer.launch(endpoint);
    return {
      newPage: async () => adaptPage(await browser.newPage()),
      close: () => browser.close(),
    };
  },
};

export async function measure(
  env: MeasureEnv,
  options: MeasureOptions,
  launcher: BrowserLauncher = defaultLauncher
): Promise<MeasureResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  const browser = await launcher.launch(env.BROWSER);
  try {
    const page = await browser.newPage();
    await page.setUserAgent(userAgent);
    return await runOnPage({ page, url: options.url, selector: options.selector, timeoutMs });
  } finally {
    await browser.close();
  }
}
