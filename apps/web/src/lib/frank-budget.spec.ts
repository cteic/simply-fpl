import { describe, expect, it } from 'vitest';

import {
  type BudgetStore,
  FRANK_DEFAULT_DAILY_CAP_TOKENS,
  reserveDailyTokens,
  resolveDailyCap,
  settleDailyTokens,
} from './frank-budget';

/**
 * A counter with the semantics of the SQL functions: reserve adds only when
 * the result stays within the cap, in one step, and settle never goes below
 * zero. It stands in for Postgres so the callers can be tested; it does not
 * prove the SQL, which has to be checked against a real database.
 */
function makeStore(initial = 0): BudgetStore & { total: () => number } {
  let reserved = initial;
  return {
    total: () => reserved,
    reserve: (tokens, cap) => {
      if (reserved + tokens > cap) return Promise.resolve({ data: false, error: null });
      reserved += tokens;
      return Promise.resolve({ data: true, error: null });
    },
    settle: (delta) => {
      reserved = Math.max(0, reserved + delta);
      return Promise.resolve({ data: null, error: null });
    },
  };
}

describe('reserveDailyTokens', () => {
  it('reserves while the day has room', async () => {
    const store = makeStore();
    expect(await reserveDailyTokens(store, 6000, 10_000)).toBe('reserved');
    expect(store.total()).toBe(6000);
  });

  it('refuses a request the cap cannot cover, and reserves nothing', async () => {
    const store = makeStore(6000);
    expect(await reserveDailyTokens(store, 6000, 10_000)).toBe('over-cap');
    expect(store.total()).toBe(6000);
  });

  it('never lets a burst of concurrent requests reserve past the cap', async () => {
    const store = makeStore();
    const cap = 30_000;
    const outcomes = await Promise.all(
      Array.from({ length: 25 }, () => reserveDailyTokens(store, 6000, cap))
    );
    expect(outcomes.filter((o) => o === 'reserved')).toHaveLength(5);
    expect(outcomes.filter((o) => o === 'over-cap')).toHaveLength(20);
    expect(store.total()).toBeLessThanOrEqual(cap);
  });

  it('reports a database error as unavailable, not as over the cap', async () => {
    const store: BudgetStore = {
      reserve: () => Promise.resolve({ data: null, error: { code: 'PGRST202' } }),
      settle: () => Promise.resolve({ data: null, error: null }),
    };
    expect(await reserveDailyTokens(store, 6000, 10_000)).toBe('unavailable');
  });

  it('reports a thrown call as unavailable', async () => {
    const store: BudgetStore = {
      reserve: () => Promise.reject(new Error('network')),
      settle: () => Promise.resolve({ data: null, error: null }),
    };
    expect(await reserveDailyTokens(store, 6000, 10_000)).toBe('unavailable');
  });

  it('treats an unexpected payload as unavailable rather than as permission', async () => {
    const store: BudgetStore = {
      reserve: () => Promise.resolve({ data: 'yes', error: null }),
      settle: () => Promise.resolve({ data: null, error: null }),
    };
    expect(await reserveDailyTokens(store, 6000, 10_000)).toBe('unavailable');
  });
});

describe('settleDailyTokens', () => {
  it('hands back what a cheap answer did not use', async () => {
    const store = makeStore();
    await reserveDailyTokens(store, 6000, 10_000);
    await settleDailyTokens(store, 6000, 4300);
    expect(store.total()).toBe(4300);
  });

  it('releases the whole reservation when the model was never called', async () => {
    const store = makeStore();
    await reserveDailyTokens(store, 6000, 10_000);
    await settleDailyTokens(store, 6000, 0);
    expect(store.total()).toBe(0);
  });

  it('records an overrun when an answer cost more than the estimate', async () => {
    const store = makeStore();
    await reserveDailyTokens(store, 6000, 10_000);
    await settleDailyTokens(store, 6000, 7100);
    expect(store.total()).toBe(7100);
  });

  it('does not throw when the settle call fails', async () => {
    const store: BudgetStore = {
      reserve: () => Promise.resolve({ data: true, error: null }),
      settle: () => Promise.reject(new Error('network')),
    };
    await expect(settleDailyTokens(store, 6000, 4000)).resolves.toBeUndefined();
  });
});

describe('resolveDailyCap', () => {
  it('uses the configured cap', () => {
    expect(resolveDailyCap('250000')).toBe(250_000);
  });

  it('falls back to a real cap when nothing is configured', () => {
    // There used to be no cap at all without the variable.
    expect(resolveDailyCap(undefined)).toBe(FRANK_DEFAULT_DAILY_CAP_TOKENS);
    expect(resolveDailyCap('')).toBe(FRANK_DEFAULT_DAILY_CAP_TOKENS);
  });

  it('ignores a value that is not a positive number', () => {
    expect(resolveDailyCap('nope')).toBe(FRANK_DEFAULT_DAILY_CAP_TOKENS);
    expect(resolveDailyCap('0')).toBe(FRANK_DEFAULT_DAILY_CAP_TOKENS);
    expect(resolveDailyCap('-5')).toBe(FRANK_DEFAULT_DAILY_CAP_TOKENS);
  });
});
