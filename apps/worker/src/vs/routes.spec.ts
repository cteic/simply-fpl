import { describe, expect, it, vi } from 'vitest';

import { handleVsData, handleVsDebugMeasure, handleVsScreenshot } from './routes';
import { type VsEnv } from './scheduled';

function makeBucket(
  store: Record<string, { body: string | Uint8Array; contentType?: string }>
): R2Bucket {
  return {
    get: vi.fn(async (key: string) => {
      const entry = store[key];
      if (!entry) return null;
      const buffer =
        typeof entry.body === 'string' ? new TextEncoder().encode(entry.body) : entry.body;
      return {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(buffer);
            controller.close();
          },
        }),
        text: async () =>
          typeof entry.body === 'string' ? entry.body : new TextDecoder().decode(entry.body),
      } as unknown as R2ObjectBody;
    }),
    put: vi.fn(),
  } as unknown as R2Bucket;
}

function envWithBucket(bucket: R2Bucket): VsEnv {
  return {
    BROWSER: { fetch: vi.fn() } as unknown as Fetcher,
    VS_BUCKET: bucket,
  };
}

describe('handleVsData', () => {
  it('returns JSON body with cache header when comparison snapshot exists', async () => {
    const snapshot = JSON.stringify({ week: '2026-W21', sites: [] });
    const env = envWithBucket(makeBucket({ 'vs/comparison.json': { body: snapshot } }));

    const res = await handleVsData(env);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(await res.text()).toBe(snapshot);
  });

  it('returns 404 when no snapshot has been written', async () => {
    const env = envWithBucket(makeBucket({}));
    const res = await handleVsData(env);
    expect(res.status).toBe(404);
  });
});

describe('handleVsScreenshot', () => {
  it('serves a JPEG with cache header for valid week and slug', async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
    const env = envWithBucket(makeBucket({ 'vs/2026-W21/simplyfpl.jpg': { body: bytes } }));

    const res = await handleVsScreenshot(env, '2026-W21', 'simplyfpl');

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/jpeg');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600');
  });

  it('rejects malformed week keys', async () => {
    const env = envWithBucket(makeBucket({}));
    const res = await handleVsScreenshot(env, '../etc', 'simplyfpl');
    expect(res.status).toBe(400);
  });

  it('rejects malformed slugs', async () => {
    const env = envWithBucket(makeBucket({}));
    const res = await handleVsScreenshot(env, '2026-W21', '../passwd');
    expect(res.status).toBe(400);
  });

  it('returns 404 when the screenshot is not in R2', async () => {
    const env = envWithBucket(makeBucket({}));
    const res = await handleVsScreenshot(env, '2026-W21', 'simplyfpl');
    expect(res.status).toBe(404);
  });
});

describe('handleVsDebugMeasure', () => {
  it('returns 403 in production without the debug token header', async () => {
    const env = {
      BROWSER: { fetch: vi.fn() } as unknown as Fetcher,
      ENVIRONMENT: 'production',
    };
    const res = await handleVsDebugMeasure(
      env,
      new Request('https://w.example/vs/debug-measure?url=https://x.example/')
    );
    expect(res.status).toBe(403);
  });

  it('returns 400 when authorised but url query is missing', async () => {
    const env = {
      BROWSER: { fetch: vi.fn() } as unknown as Fetcher,
      ENVIRONMENT: 'development',
      VS_DEBUG_TOKEN: 'test-token',
    };
    const res = await handleVsDebugMeasure(
      env,
      new Request('https://w.example/vs/debug-measure', {
        headers: { 'x-vs-debug': 'test-token' },
      })
    );
    expect(res.status).toBe(400);
  });
});
