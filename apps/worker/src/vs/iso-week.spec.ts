import { describe, expect, it } from 'vitest';

import { isValidIsoWeekKey, isoWeekKey } from './iso-week';

describe('isoWeekKey', () => {
  it('returns the ISO year-week for a known Monday', () => {
    expect(isoWeekKey(new Date('2026-05-18T06:00:00.000Z'))).toBe('2026-W21');
  });

  it('handles year-boundary Mondays correctly', () => {
    expect(isoWeekKey(new Date('2024-12-30T00:00:00.000Z'))).toBe('2025-W01');
  });

  it('produces zero-padded week numbers', () => {
    expect(isoWeekKey(new Date('2026-01-05T00:00:00.000Z'))).toBe('2026-W02');
  });
});

describe('isValidIsoWeekKey', () => {
  it('accepts well-formed keys', () => {
    expect(isValidIsoWeekKey('2026-W21')).toBe(true);
    expect(isValidIsoWeekKey('2025-W01')).toBe(true);
  });

  it('rejects malformed keys', () => {
    expect(isValidIsoWeekKey('2026-21')).toBe(false);
    expect(isValidIsoWeekKey('../etc')).toBe(false);
    expect(isValidIsoWeekKey('2026-w21')).toBe(false);
    expect(isValidIsoWeekKey('2026-W2')).toBe(false);
  });
});
