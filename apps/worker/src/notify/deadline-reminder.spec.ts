import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Env } from '../index';
import { runDeadlineReminder } from './deadline-reminder';

const dispatchNotification = vi.fn();
vi.mock('./dispatch', () => ({
  dispatchNotification: (...args: unknown[]) => dispatchNotification(...args),
}));

const DEADLINE = Date.parse('2026-11-21T11:00:00Z');

function makeEnv(): Env {
  const store = new Map<string, string>([
    [
      'fpl:/bootstrap-static/',
      JSON.stringify({
        events: [
          { id: 11, deadline_time: '2026-11-14T11:00:00Z', finished: true },
          { id: 12, deadline_time: '2026-11-21T11:00:00Z', finished: false },
        ],
      }),
    ],
  ]);
  const kv = {
    get: (key: string) => Promise.resolve(store.get(key) ?? null),
    put: (key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    },
  };
  const env: unknown = { FPL_CACHE: kv, FPL_BASE_URL: 'https://fpl.test' };
  // The reminder only touches FPL_CACHE and FPL_BASE_URL; the rest of Env is unused here.
  return env as Env;
}

describe('runDeadlineReminder', () => {
  beforeEach(() => dispatchNotification.mockReset());

  it('stays quiet on a day with no deadline in the next hour', async () => {
    await runDeadlineReminder(makeEnv(), Date.parse('2026-11-18T17:30:00Z'));
    expect(dispatchNotification).not.toHaveBeenCalled();
  });

  it('reminds once when the real deadline is under an hour away', async () => {
    const env = makeEnv();
    await runDeadlineReminder(env, DEADLINE - 50 * 60_000);
    await runDeadlineReminder(env, DEADLINE - 40 * 60_000);
    expect(dispatchNotification).toHaveBeenCalledTimes(1);
    expect(dispatchNotification.mock.calls[0]?.[1]).toMatchObject({
      payload: { title: 'FPL deadline in 50 minutes' },
    });
  });
});
