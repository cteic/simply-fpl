import { describe, expect, it } from 'vitest';

import type { FplEntryGameweekPicks, FplEntryPick } from '@simplyfpl/types';

import { computeDifferentials } from './compute-differentials';

function makePick(
  element: number,
  position: number,
  opts: { captain?: boolean; vc?: boolean } = {}
): FplEntryPick {
  let multiplier = position <= 11 ? 1 : 0;
  if (opts.captain) multiplier = 2;
  return {
    element,
    position,
    multiplier,
    is_captain: opts.captain ?? false,
    is_vice_captain: opts.vc ?? false,
  };
}

function makePicks(picks: FplEntryPick[]): FplEntryGameweekPicks {
  return {
    active_chip: null,
    automatic_subs: [],
    entry_history: {
      event: 1,
      points: 0,
      total_points: 0,
      rank: 1,
      rank_sort: 1,
      overall_rank: 1,
      event_transfers: 0,
      event_transfers_cost: 0,
      points_on_bench: 0,
    },
    picks,
  };
}

describe('computeDifferentials', () => {
  it('reports same=true when both managers captain the same player', () => {
    const yours = makePicks([
      makePick(1, 1, { captain: true }),
      ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((e) => makePick(e, e)),
    ]);
    const theirs = makePicks([
      makePick(1, 1, { captain: true }),
      ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((e) => makePick(e, e)),
    ]);
    const result = computeDifferentials(yours, theirs);
    expect(result.captaincyDiff.same).toBe(true);
    expect(result.captaincyDiff.yours).toBe(1);
    expect(result.captaincyDiff.theirs).toBe(1);
    expect(result.theirsOnly).toHaveLength(0);
    expect(result.yoursOnly).toHaveLength(0);
  });

  it('reports same=false when captains differ', () => {
    const yours = makePicks([
      makePick(1, 1, { captain: true }),
      ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((e) => makePick(e, e)),
    ]);
    const theirs = makePicks([
      makePick(5, 1, { captain: true }),
      ...[1, 2, 3, 4, 6, 7, 8, 9, 10, 11].map((e, i) => makePick(e, i + 2)),
    ]);
    const result = computeDifferentials(yours, theirs);
    expect(result.captaincyDiff.same).toBe(false);
    expect(result.captaincyDiff.yours).toBe(1);
    expect(result.captaincyDiff.theirs).toBe(5);
  });

  it('identifies theirsOnly and yoursOnly differential XI elements', () => {
    // Your XI: 1-11. Their XI: 1-10 + 20 (element 20 unique to them, element 11 unique to you)
    const yours = makePicks([
      makePick(1, 1, { captain: true }),
      ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((e) => makePick(e, e)),
    ]);
    const theirs = makePicks([
      makePick(1, 1, { captain: true }),
      ...[2, 3, 4, 5, 6, 7, 8, 9, 10].map((e) => makePick(e, e)),
      makePick(20, 11),
    ]);
    const result = computeDifferentials(yours, theirs);
    expect(result.theirsOnly).toEqual([20]);
    expect(result.yoursOnly).toEqual([11]);
  });
});
