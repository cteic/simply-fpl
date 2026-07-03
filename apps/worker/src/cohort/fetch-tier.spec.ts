import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type FetchTierEnv, TIER_CONFIGS, resumeCohortFetch } from './fetch-tier';

function makeKvNamespace(): KVNamespace {
  const store = new Map<string, string>();
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

function makeLockNamespace(): DurableObjectNamespace {
  const locks = new Map<string, number>();
  return {
    idFromName: vi.fn((name: string) => ({ name })),
    get: vi.fn((id: { name: string }) => ({
      fetch: vi.fn(async (input: string) => {
        const url = new URL(input);
        if (url.pathname === '/acquire') {
          const ttlSeconds = Number(url.searchParams.get('ttl') ?? '300');
          const expiresAt = locks.get(id.name);
          if (expiresAt !== undefined && expiresAt > Date.now()) {
            return new Response('held', { status: 409 });
          }
          locks.set(id.name, Date.now() + ttlSeconds * 1000);
          return new Response('acquired', { status: 200 });
        }
        if (url.pathname === '/release') {
          locks.delete(id.name);
          return new Response('released', { status: 200 });
        }
        return new Response('not found', { status: 404 });
      }),
    })),
  } as unknown as DurableObjectNamespace;
}

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_SET_TIMEOUT = globalThis.setTimeout;

describe('resumeCohortFetch lock serialisation', () => {
  beforeEach(() => {
    globalThis.setTimeout = ((callback: () => void) => {
      callback();
      return 0;
    }) as unknown as typeof setTimeout;
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    })) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    globalThis.setTimeout = ORIGINAL_SET_TIMEOUT;
    vi.restoreAllMocks();
  });

  it('lets exactly one of two concurrent ticks proceed for the same gw and tier', async () => {
    const env: FetchTierEnv = {
      FPL_CACHE: makeKvNamespace(),
      COHORT_LOCK: makeLockNamespace(),
    };

    const results = await Promise.all([
      resumeCohortFetch(env, 38, TIER_CONFIGS.legendary),
      resumeCohortFetch(env, 38, TIER_CONFIGS.legendary),
    ]);

    const proceeded = results.filter((r) => r.fetched > 0);
    expect(proceeded).toHaveLength(1);
  });

  it('releases the lock so a later tick can proceed', async () => {
    const env: FetchTierEnv = {
      FPL_CACHE: makeKvNamespace(),
      COHORT_LOCK: makeLockNamespace(),
    };

    await resumeCohortFetch(env, 38, TIER_CONFIGS.legendary);
    await env.FPL_CACHE.delete('cohort:pause:fpl');
    const second = await resumeCohortFetch(env, 38, TIER_CONFIGS.legendary);
    expect(second.fetched).toBeGreaterThan(0);
  });
});
