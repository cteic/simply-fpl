import { describe, expect, it } from 'vitest';

import type { FplLiveElement, FplLiveGameweek } from '@simplyfpl/types';

import { diffLiveSnapshots } from './snapshot-diff';

function makeElement(id: number, overrides: Partial<FplLiveElement['stats']> = {}): FplLiveElement {
  return {
    id,
    stats: {
      minutes: 0,
      goals_scored: 0,
      assists: 0,
      clean_sheets: 0,
      goals_conceded: 0,
      yellow_cards: 0,
      red_cards: 0,
      saves: 0,
      bonus: 0,
      bps: 0,
      total_points: 0,
      ...overrides,
    },
    explain: [],
  };
}

describe('diffLiveSnapshots', () => {
  it('returns all elements when prev is null', () => {
    const next: FplLiveGameweek = { elements: [makeElement(1), makeElement(2)] };
    const result = diffLiveSnapshots(null, next);
    expect(result).toHaveLength(2);
  });

  it('returns empty array when nothing changed', () => {
    const snapshot: FplLiveGameweek = { elements: [makeElement(1), makeElement(2)] };
    const result = diffLiveSnapshots(snapshot, {
      elements: [makeElement(1), makeElement(2)],
    });
    expect(result).toEqual([]);
  });

  it('returns only elements whose stats changed', () => {
    const prev: FplLiveGameweek = {
      elements: [makeElement(1), makeElement(2, { goals_scored: 0 })],
    };
    const next: FplLiveGameweek = {
      elements: [makeElement(1), makeElement(2, { goals_scored: 1, total_points: 4 })],
    };
    const result = diffLiveSnapshots(prev, next);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(2);
  });

  it('treats new elements as changed', () => {
    const prev: FplLiveGameweek = { elements: [makeElement(1)] };
    const next: FplLiveGameweek = { elements: [makeElement(1), makeElement(99)] };
    const result = diffLiveSnapshots(prev, next);
    expect(result.map((e) => e.id)).toEqual([99]);
  });
});
