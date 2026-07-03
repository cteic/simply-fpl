import { describe, expect, it } from 'vitest';

import { resolveTier } from './entitlement';

describe('resolveTier', () => {
  it('returns the stored tier when set', () => {
    expect(resolveTier({ tier: 'pro' })).toBe('pro');
    expect(resolveTier({ tier: 'ultimate' })).toBe('ultimate');
  });

  it('falls back to free for missing subscription state', () => {
    expect(resolveTier({ tier: null })).toBe('free');
    expect(resolveTier({ tier: undefined })).toBe('free');
  });
});
