import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

import { handleFrankAskCacheGet, handleFrankAskCachePut } from './ask-cache';
import type { AskCacheEnv } from './ask-cache';

const feature = await loadFeature('./ask-cache.feature');

interface KvPutOptions {
  expirationTtl?: number;
}

interface FakeKv {
  namespace: KVNamespace;
  store: Map<string, string>;
  ttls: Map<string, number | undefined>;
}

function makeKv(initial: Record<string, string> = {}): FakeKv {
  const store = new Map(Object.entries(initial));
  const ttls = new Map<string, number | undefined>();
  const namespace = {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string, options?: KvPutOptions) => {
      store.set(key, value);
      ttls.set(key, options?.expirationTtl);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
      ttls.delete(key);
    }),
  } as unknown as KVNamespace;
  return { namespace, store, ttls };
}

function makeRequest(method: string, body?: string, secret?: string): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret !== undefined) headers['X-Frank-Cache-Secret'] = secret;
  return {
    method,
    headers: {
      get: (name: string) => headers[name] ?? null,
    },
    text: () => Promise.resolve(body ?? ''),
  } as unknown as Request;
}

const CACHED_PAYLOAD = JSON.stringify({ advice: 'Captain Salah.', follow_up_question: null });
const TEST_KEY = 'frank:ask:abc:def';

describeFeature(feature, ({ Scenario }) => {
  Scenario('GET with a cached key returns the stored payload', ({ Given, When, Then, And }) => {
    let kv: FakeKv;
    let response: Response;

    Given(
      'the FRANK_WEEKLY_CACHE holds a cached ask response under key "frank:ask:abc:def"',
      () => {
        kv = makeKv({ [TEST_KEY]: CACHED_PAYLOAD });
      }
    );

    When('a GET request is made for key "frank:ask:abc:def"', async () => {
      const env: AskCacheEnv = { FRANK_WEEKLY_CACHE: kv.namespace };
      response = await handleFrankAskCacheGet(env, TEST_KEY);
    });

    Then('the response status is 200', () => {
      expect(response.status).toBe(200);
    });

    And('the response header X-Cache is HIT', () => {
      expect(response.headers.get('X-Cache')).toBe('HIT');
    });

    And('the response body matches the stored payload', async () => {
      const body = await response.text();
      expect(body).toBe(CACHED_PAYLOAD);
    });
  });

  Scenario('GET for a missing key returns 404', ({ Given, When, Then, And }) => {
    let kv: FakeKv;
    let response: Response;

    Given('the FRANK_WEEKLY_CACHE is empty', () => {
      kv = makeKv();
    });

    When('a GET request is made for key "frank:ask:abc:def"', async () => {
      const env: AskCacheEnv = { FRANK_WEEKLY_CACHE: kv.namespace };
      response = await handleFrankAskCacheGet(env, TEST_KEY);
    });

    Then('the response status is 404', () => {
      expect(response.status).toBe(404);
    });

    And('the response header X-Cache is MISS', () => {
      expect(response.headers.get('X-Cache')).toBe('MISS');
    });
  });

  Scenario('PUT with the correct secret stores the payload', ({ Given, And, When, Then }) => {
    let kv: FakeKv;
    let response: Response;

    Given('the FRANK_CACHE_WRITE_SECRET is "test-secret"', () => {
      // declared below in env
    });

    And('the FRANK_WEEKLY_CACHE is empty', () => {
      kv = makeKv();
    });

    When('a PUT request is made with the correct secret and a JSON payload', async () => {
      const env: AskCacheEnv = {
        FRANK_WEEKLY_CACHE: kv.namespace,
        FRANK_CACHE_WRITE_SECRET: 'test-secret',
      };
      const req = makeRequest('PUT', CACHED_PAYLOAD, 'test-secret');
      response = await handleFrankAskCachePut(env, TEST_KEY, req);
    });

    Then('the response status is 200', () => {
      expect(response.status).toBe(200);
    });

    And('the FRANK_WEEKLY_CACHE contains the stored payload under the given key', () => {
      expect(kv.store.get(TEST_KEY)).toBe(CACHED_PAYLOAD);
    });
  });

  Scenario('PUT with an incorrect secret is rejected', ({ Given, When, Then }) => {
    let response: Response;

    Given('the FRANK_CACHE_WRITE_SECRET is "test-secret"', () => {
      // declared below in env
    });

    When('a PUT request is made with an incorrect secret', async () => {
      const kv = makeKv();
      const env: AskCacheEnv = {
        FRANK_WEEKLY_CACHE: kv.namespace,
        FRANK_CACHE_WRITE_SECRET: 'test-secret',
      };
      const req = makeRequest('PUT', CACHED_PAYLOAD, 'wrong-secret');
      response = await handleFrankAskCachePut(env, TEST_KEY, req);
    });

    Then('the response status is 403', () => {
      expect(response.status).toBe(403);
    });
  });
});
