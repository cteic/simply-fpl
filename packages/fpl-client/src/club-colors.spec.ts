import { describe, expect, it } from 'vitest';

import { getClubColor } from './club-colors';

describe('getClubColor', () => {
  it('returns the primary colour for a known club short name', () => {
    expect(getClubColor('LIV')).toBe('#C8102E');
    expect(getClubColor('MCI')).toBe('#6CABDD');
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(getClubColor('liv')).toBe('#C8102E');
    expect(getClubColor(' Ars ')).toBe('#EF0107');
  });

  it('resolves full FPL team names too', () => {
    expect(getClubColor('Liverpool')).toBe('#C8102E');
    expect(getClubColor('Man City')).toBe('#6CABDD');
    expect(getClubColor('Spurs')).toBe('#132257');
  });

  it('returns undefined for unknown or empty input', () => {
    expect(getClubColor('ZZZ')).toBeUndefined();
    expect(getClubColor('')).toBeUndefined();
    expect(getClubColor(null)).toBeUndefined();
    expect(getClubColor(undefined)).toBeUndefined();
  });
});
