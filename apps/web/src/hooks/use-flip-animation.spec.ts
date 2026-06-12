import { describe, expect, it } from 'vitest';

import { computeFlipDeltas } from './use-flip-animation';

describe('computeFlipDeltas', () => {
  it('returns an empty map when no elements changed position', () => {
    const prev = new Map([
      [1, 0],
      [2, 50],
      [3, 100],
    ]);
    const curr = new Map([
      [1, 0],
      [2, 50],
      [3, 100],
    ]);
    expect(computeFlipDeltas(prev, curr).size).toBe(0);
  });

  it('computes the correct delta when two entries swap positions', () => {
    const prev = new Map([
      [1, 0],
      [2, 52],
    ]);
    const curr = new Map([
      [1, 52],
      [2, 0],
    ]);
    const deltas = computeFlipDeltas(prev, curr);
    expect(deltas.get(1)).toBe(-52);
    expect(deltas.get(2)).toBe(52);
  });

  it('ignores elements with no previous position (new entries)', () => {
    const prev = new Map([[1, 0]]);
    const curr = new Map([
      [1, 0],
      [2, 52],
    ]);
    expect(computeFlipDeltas(prev, curr).size).toBe(0);
  });

  it('only includes elements that actually moved', () => {
    const prev = new Map([
      [1, 0],
      [2, 52],
      [3, 104],
    ]);
    const curr = new Map([
      [1, 0],
      [2, 104],
      [3, 52],
    ]);
    const deltas = computeFlipDeltas(prev, curr);
    expect(deltas.has(1)).toBe(false);
    expect(deltas.get(2)).toBe(-52);
    expect(deltas.get(3)).toBe(52);
  });
});
