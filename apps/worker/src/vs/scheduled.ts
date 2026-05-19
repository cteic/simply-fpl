import { isoWeekKey } from './iso-week';
import { type BrowserLauncher, type MeasureEnv, type MeasureResult, measure } from './measure';

export interface VsBucketPutOptions {
  httpMetadata?: { contentType?: string };
}

export interface VsBucketObject {
  body: ReadableStream;
  text(): Promise<string>;
}

export interface VsBucket {
  put(key: string, value: string | Uint8Array, options?: VsBucketPutOptions): Promise<unknown>;
  get(key: string): Promise<VsBucketObject | null>;
}

export interface VsEnv extends MeasureEnv {
  VS_BUCKET: VsBucket;
}

export interface SiteTarget {
  slug: string;
  label: string;
  url: string;
  selector: string;
}

export const DEFAULT_TARGETS: SiteTarget[] = [
  {
    slug: 'simplyfpl',
    label: 'SimplyFPL',
    url: 'https://simplyfpl.com/',
    selector: '[data-testid="live-rank-value"]',
  },
  {
    slug: 'livefpl',
    label: 'livefpl.net',
    url: 'https://livefpl.net/',
    selector: '#live_points',
  },
];

export interface ComparisonSiteEntry {
  slug: string;
  label: string;
  url: string;
  timeToFirstData: number | null;
  totalBytes: number;
  thirdPartyCount: number;
  screenshotKey: string;
}

export interface ComparisonSnapshot {
  measuredAt: string;
  week: string;
  sites: ComparisonSiteEntry[];
}

export interface ComparisonErrorRecord {
  measuredAt: string;
  week: string;
  failedSlug: string;
  message: string;
}

const LATEST_KEY = 'vs/comparison.json';
const LAST_ERROR_KEY = 'vs/last-error.json';

function historyJsonKey(week: string): string {
  return `vs/${week}/comparison.json`;
}

function screenshotKey(week: string, slug: string): string {
  return `vs/${week}/${slug}.jpg`;
}

function toSiteEntry(target: SiteTarget, result: MeasureResult, week: string): ComparisonSiteEntry {
  return {
    slug: target.slug,
    label: target.label,
    url: target.url,
    timeToFirstData: result.timeToFirstData,
    totalBytes: result.totalBytes,
    thirdPartyCount: result.thirdPartyCount,
    screenshotKey: screenshotKey(week, target.slug),
  };
}

export interface RunComparisonOptions {
  now?: Date;
  targets?: SiteTarget[];
  launcher?: BrowserLauncher;
}

export async function runComparison(
  env: VsEnv,
  options: RunComparisonOptions = {}
): Promise<ComparisonSnapshot | ComparisonErrorRecord> {
  const now = options.now ?? new Date();
  const week = isoWeekKey(now);
  const measuredAt = now.toISOString();
  const targets = options.targets ?? DEFAULT_TARGETS;

  const sites: ComparisonSiteEntry[] = [];
  for (const target of targets) {
    let result: MeasureResult;
    try {
      result = await measure(env, { url: target.url, selector: target.selector }, options.launcher);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const record: ComparisonErrorRecord = {
        measuredAt,
        week,
        failedSlug: target.slug,
        message,
      };
      await env.VS_BUCKET.put(LAST_ERROR_KEY, JSON.stringify(record, null, 2), {
        httpMetadata: { contentType: 'application/json' },
      });
      return record;
    }

    await env.VS_BUCKET.put(screenshotKey(week, target.slug), result.screenshotBytes, {
      httpMetadata: { contentType: 'image/jpeg' },
    });
    sites.push(toSiteEntry(target, result, week));
  }

  const snapshot: ComparisonSnapshot = { measuredAt, week, sites };
  const body = JSON.stringify(snapshot, null, 2);
  await env.VS_BUCKET.put(LATEST_KEY, body, {
    httpMetadata: { contentType: 'application/json' },
  });
  await env.VS_BUCKET.put(historyJsonKey(week), body, {
    httpMetadata: { contentType: 'application/json' },
  });
  return snapshot;
}
