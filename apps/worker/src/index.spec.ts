import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import worker, { type Env } from './index';

function makeKvNamespace(initial: Record<string, string> = {}): KVNamespace {
  const store = new Map(Object.entries(initial));
  return {
    get: vi.fn(async (key: string, type?: string) => {
      const raw = store.get(key);
      if (raw === undefined) return null;
      return type === 'json' ? JSON.parse(raw) : raw;
    }),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  } as unknown as KVNamespace;
}

function makeCtx(): ExecutionContext {
  return {
    waitUntil(): void {
      /* noop */
    },
    passThroughOnException(): void {
      /* noop */
    },
  } as unknown as ExecutionContext;
}

function makeEnv(kv: KVNamespace): Env {
  return {
    FPL_CACHE: kv,
    FPL_BASE_URL: 'https://fpl.example/api',
  } as unknown as Env;
}

const ORIGINAL_FETCH = globalThis.fetch;
const CLIENT_IP = '9.9.9.9';

function snapshotRequest(): Request {
  return new Request('https://worker.example/snapshot/entry/123', {
    headers: { 'CF-Connecting-IP': CLIENT_IP },
  });
}

describe('enforceRateLimit uses the per-route limit, not a shared constant', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('/status enforces STATUS_RATE_LIMIT=10: allows request 10, rejects request 11', async () => {
    const kv = makeKvNamespace({
      [`vs:rl:rl:10:${CLIENT_IP}`]: JSON.stringify({ count: 10, windowStart: Date.now() }),
    });
    const req = new Request('https://worker.example/status', {
      headers: { 'CF-Connecting-IP': CLIENT_IP },
    });

    globalThis.fetch = vi.fn(
      async () => new Response('{}', { status: 200 })
    ) as unknown as typeof fetch;
    const env = makeEnv(kv);
    (env as Env & { LIVE_GW: unknown }).LIVE_GW = {
      idFromName: () => ({ toString: () => 'stub-id' }),
      get: () => null,
    } as unknown as DurableObjectNamespace;
    const res = await worker.fetch(req, env, makeCtx());

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).not.toBeNull();
  });

  it('/status does NOT rate-limit at 30: a count of 30 under the limit-10 key is still blocked', async () => {
    const kv = makeKvNamespace({
      [`vs:rl:rl:10:${CLIENT_IP}`]: JSON.stringify({ count: 10, windowStart: Date.now() }),
    });
    const req = new Request('https://worker.example/status', {
      headers: { 'CF-Connecting-IP': CLIENT_IP },
    });

    globalThis.fetch = vi.fn(
      async () => new Response('{}', { status: 200 })
    ) as unknown as typeof fetch;
    const env = makeEnv(kv);
    (env as Env & { LIVE_GW: unknown }).LIVE_GW = {
      idFromName: () => ({ toString: () => 'stub-id' }),
      get: () => null,
    } as unknown as DurableObjectNamespace;
    const res = await worker.fetch(req, env, makeCtx());

    expect(res.status).toBe(429);
  });

  it('/fpl/* enforces PUBLIC_RATE_LIMIT=120: count of 30 is still allowed', async () => {
    const kv = makeKvNamespace({
      [`vs:rl:rl:120:${CLIENT_IP}`]: JSON.stringify({ count: 30, windowStart: Date.now() }),
    });
    const req = new Request('https://worker.example/fpl/bootstrap-static/', {
      headers: { 'CF-Connecting-IP': CLIENT_IP },
    });

    globalThis.fetch = vi.fn(
      async () => new Response('{}', { status: 200 })
    ) as unknown as typeof fetch;
    const res = await worker.fetch(req, makeEnv(kv), makeCtx());

    expect(res.status).not.toBe(429);
  });

  it('/fpl/* enforces PUBLIC_RATE_LIMIT=120: count of 120 is blocked', async () => {
    const kv = makeKvNamespace({
      [`vs:rl:rl:120:${CLIENT_IP}`]: JSON.stringify({ count: 120, windowStart: Date.now() }),
    });
    const req = new Request('https://worker.example/fpl/bootstrap-static/', {
      headers: { 'CF-Connecting-IP': CLIENT_IP },
    });

    globalThis.fetch = vi.fn(
      async () => new Response('{}', { status: 200 })
    ) as unknown as typeof fetch;
    const res = await worker.fetch(req, makeEnv(kv), makeCtx());

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).not.toBeNull();
  });

  it('/fpl/* and /status use different KV key namespaces (no cross-limit contamination)', async () => {
    const kv = makeKvNamespace({
      [`vs:rl:rl:10:${CLIENT_IP}`]: JSON.stringify({ count: 10, windowStart: Date.now() }),
    });
    const req = new Request('https://worker.example/fpl/bootstrap-static/', {
      headers: { 'CF-Connecting-IP': CLIENT_IP },
    });

    globalThis.fetch = vi.fn(
      async () => new Response('{}', { status: 200 })
    ) as unknown as typeof fetch;
    const res = await worker.fetch(req, makeEnv(kv), makeCtx());

    expect(res.status).not.toBe(429);
  });
});

describe('GET /snapshot/entry/:id rate limiting', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('upstream unavailable');
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it('returns 429 once the per-ip window is exhausted', async () => {
    const kv = makeKvNamespace({
      [`vs:rl:rl:120:${CLIENT_IP}`]: JSON.stringify({ count: 120, windowStart: Date.now() }),
    });

    const res = await worker.fetch(snapshotRequest(), makeEnv(kv), makeCtx());

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).not.toBeNull();
  });

  it('lets requests under the limit through to the snapshot handler', async () => {
    const kv = makeKvNamespace();

    const res = await worker.fetch(snapshotRequest(), makeEnv(kv), makeCtx());

    expect(res.status).toBe(502);
  });
});
