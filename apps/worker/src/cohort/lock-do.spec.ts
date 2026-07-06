import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CohortLockDO } from './lock-do';

interface FakeStorage {
  data: Map<string, unknown>;
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

function createFakeStorage(): FakeStorage {
  const storage: FakeStorage = {
    data: new Map(),
    async get<T>(key: string): Promise<T | undefined> {
      return storage.data.get(key) as T | undefined;
    },
    async put(key: string, value: unknown): Promise<void> {
      storage.data.set(key, value);
    },
    async delete(key: string): Promise<void> {
      storage.data.delete(key);
    },
  };
  return storage;
}

function makeLock(): CohortLockDO {
  const fakeState = { storage: createFakeStorage() } as unknown as DurableObjectState;
  return new CohortLockDO(fakeState);
}

describe('CohortLockDO', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('grants the first acquire and rejects a second while held', async () => {
    const lock = makeLock();
    const first = await lock.fetch(new Request('https://lock/acquire?ttl=300'));
    expect(first.status).toBe(200);
    const second = await lock.fetch(new Request('https://lock/acquire?ttl=300'));
    expect(second.status).toBe(409);
  });

  it('grants again after release', async () => {
    const lock = makeLock();
    await lock.fetch(new Request('https://lock/acquire?ttl=300'));
    const released = await lock.fetch(new Request('https://lock/release'));
    expect(released.status).toBe(200);
    const again = await lock.fetch(new Request('https://lock/acquire?ttl=300'));
    expect(again.status).toBe(200);
  });

  it('expires a stale hold after its ttl', async () => {
    const lock = makeLock();
    await lock.fetch(new Request('https://lock/acquire?ttl=300'));
    vi.advanceTimersByTime(301 * 1000);
    const res = await lock.fetch(new Request('https://lock/acquire?ttl=300'));
    expect(res.status).toBe(200);
  });

  it('falls back to the default ttl when the param is invalid', async () => {
    const lock = makeLock();
    const res = await lock.fetch(new Request('https://lock/acquire?ttl=nope'));
    expect(res.status).toBe(200);
    vi.advanceTimersByTime(299 * 1000);
    const held = await lock.fetch(new Request('https://lock/acquire?ttl=300'));
    expect(held.status).toBe(409);
  });

  it('404s unknown operations', async () => {
    const lock = makeLock();
    const res = await lock.fetch(new Request('https://lock/steal'));
    expect(res.status).toBe(404);
  });
});
