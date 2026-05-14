import { describe, expect, it } from 'vitest';

import type { FplEntryGameweekPicks } from '@simplyfpl/types';

import { partitionResults } from './use-rival-picks';

const makePicks = (entryId: number): FplEntryGameweekPicks => ({
  active_chip: null,
  automatic_subs: [],
  entry_history: {
    event: 1,
    points: 50,
    total_points: 50,
    rank: 1000,
    rank_sort: 1000,
    overall_rank: 500000,
    event_transfers: 0,
    event_transfers_cost: 0,
    points_on_bench: 5,
  },
  picks: [
    {
      element: entryId * 10,
      position: 1,
      multiplier: 1,
      is_captain: false,
      is_vice_captain: false,
    },
  ],
});

describe('partitionResults', () => {
  it('returns empty maps for empty inputs', () => {
    const { data, errors } = partitionResults([], []);
    expect(data.size).toBe(0);
    expect(errors.size).toBe(0);
  });

  it('puts successful results in data map', () => {
    const picks = makePicks(1);
    const results = [{ status: 'success' as const, data: picks, error: undefined }];
    const { data, errors } = partitionResults(results, [1]);
    expect(data.get(1)).toBe(picks);
    expect(errors.size).toBe(0);
  });

  it('isolates a failed entry without poisoning successful ones', () => {
    const picks = makePicks(2);
    const results = [
      { status: 'error' as const, data: undefined, error: new Error('network error') },
      { status: 'success' as const, data: picks, error: undefined },
    ];
    const { data, errors } = partitionResults(results, [1, 2]);
    expect(data.get(2)).toBe(picks);
    expect(data.has(1)).toBe(false);
    expect(errors.get(1)).toBeInstanceOf(Error);
    expect(errors.get(1)?.message).toBe('network error');
  });

  it('wraps non-Error error values', () => {
    const results = [{ status: 'error' as const, data: undefined, error: 'string error' }];
    const { errors } = partitionResults(results, [99]);
    expect(errors.get(99)).toBeInstanceOf(Error);
    expect(errors.get(99)?.message).toBe('string error');
  });

  it('pending status contributes neither data nor error', () => {
    const results = [{ status: 'pending' as const, data: undefined, error: undefined }];
    const { data, errors } = partitionResults(results, [5]);
    expect(data.size).toBe(0);
    expect(errors.size).toBe(0);
  });
});
