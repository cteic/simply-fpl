import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

import {
  type KvStore,
  type TargetFetcher,
  type TimedFetchEnv,
  checkRateLimit,
  handleVsTimedFetch,
} from './timed-fetch';

function makeKv(initial: Record<string, unknown> = {}): KvStore {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, JSON.parse(value));
    }),
  };
}

function makeSuccessFetcher(durationMs = 150, bytes = 1024): TargetFetcher {
  return {
    fetch: vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, durationMs));
      return { status: 200, body: new ArrayBuffer(bytes) };
    }),
  };
}

function makeRequest(target: string, ip = '1.2.3.4'): Request {
  return new Request(`https://worker.example/vs/timed-fetch?target=${target}`, {
    headers: { 'CF-Connecting-IP': ip },
  });
}

function envWith(kv: KvStore): TimedFetchEnv {
  return { FPL_CACHE: kv };
}

const feature = await loadFeature('src/vs/timed-fetch.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Valid request returns timing data', ({ Given, When, Then }) => {
    let kv: KvStore;
    let response: Response;

    Given('the IP "1.2.3.4" has no prior requests this minute', () => {
      kv = makeKv();
    });

    When('GET /vs/timed-fetch?target=simplyfpl is requested from that IP', async () => {
      response = await handleVsTimedFetch(
        envWith(kv),
        makeRequest('simplyfpl'),
        makeSuccessFetcher()
      );
    });

    Then('the response is 200 with durationMs and bytesReceived', async () => {
      expect(response.status).toBe(200);
      const body: unknown = await response.json();
      expect(body).toHaveProperty('durationMs', expect.any(Number));
      expect(body).toHaveProperty('bytesReceived', expect.any(Number));
      expect(body).toHaveProperty('target', 'simplyfpl');
    });
  });

  Scenario('Rate limit enforced after 30 requests per minute', ({ Given, When, Then }) => {
    let kv: KvStore;
    let response: Response;
    const now = Date.now();

    Given('the IP "1.2.3.4" has already made 30 requests this minute', () => {
      kv = makeKv({ 'vs:rl:1.2.3.4': { count: 30, windowStart: now - 10_000 } });
    });

    When('GET /vs/timed-fetch?target=simplyfpl is requested from that IP', async () => {
      response = await handleVsTimedFetch(
        envWith(kv),
        makeRequest('simplyfpl'),
        makeSuccessFetcher()
      );
    });

    Then('the response is 429 with retryAfterSeconds', async () => {
      expect(response.status).toBe(429);
      const body: unknown = await response.json();
      expect(body).toHaveProperty('error', 'rate_limited');
      expect(body).toHaveProperty('retryAfterSeconds', expect.any(Number));
      expect(response.headers.get('Retry-After')).toBeTruthy();
    });
  });

  Scenario('Unknown target returns 400', ({ When, Then }) => {
    let response: Response;

    When('GET /vs/timed-fetch?target=unknown is requested', async () => {
      response = await handleVsTimedFetch(
        envWith(makeKv()),
        new Request('https://worker.example/vs/timed-fetch?target=unknown'),
        makeSuccessFetcher()
      );
    });

    Then('the response is 400', () => {
      expect(response.status).toBe(400);
    });
  });

  Scenario('A strict limit-3 window rejects the fourth request', ({ Given, When, Then }) => {
    let kv: KvStore;
    let result: { allowed: boolean; retryAfterSeconds: number };
    const now = Date.now();

    Given('the IP "2.3.4.5" has made 3 requests in a window with limit 3', () => {
      kv = makeKv({ 'vs:rl:2.3.4.5': { count: 3, windowStart: now - 5_000 } });
    });

    When('checkRateLimit is called with limit 3 for IP "2.3.4.5"', async () => {
      result = await checkRateLimit(kv, '2.3.4.5', now, 3);
    });

    Then('the check result is not allowed', () => {
      expect(result.allowed).toBe(false);
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  Scenario('A looser limit-10 window allows the fourth request', ({ Given, When, Then }) => {
    let kv: KvStore;
    let result: { allowed: boolean; retryAfterSeconds: number };
    const now = Date.now();

    Given('the IP "2.3.4.5" has made 3 requests in a window with limit 10', () => {
      kv = makeKv({ 'vs:rl:2.3.4.5': { count: 3, windowStart: now - 5_000 } });
    });

    When('checkRateLimit is called with limit 10 for IP "2.3.4.5"', async () => {
      result = await checkRateLimit(kv, '2.3.4.5', now, 10);
    });

    Then('the check result is allowed', () => {
      expect(result.allowed).toBe(true);
      expect(result.retryAfterSeconds).toBe(0);
    });
  });
});
