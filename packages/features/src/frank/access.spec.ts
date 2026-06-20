import { describe, expect, it } from 'vitest';

import { resolveFrankAccess } from './access';

describe('resolveFrankAccess', () => {
  it('serves the free tier from the weekly cache with no on-demand access', () => {
    const access = resolveFrankAccess('free');
    expect(access.source).toBe('weekly-cache');
    expect(access.canAskOnDemand).toBe(false);
    expect(access.upgradeTo).toBe('ultimate');
  });

  it('serves the pro tier from the weekly cache with no on-demand access', () => {
    const access = resolveFrankAccess('pro');
    expect(access.source).toBe('weekly-cache');
    expect(access.canAskOnDemand).toBe(false);
    expect(access.upgradeTo).toBe('ultimate');
  });

  it('lets the ultimate tier ask live with nothing left to upgrade to', () => {
    const access = resolveFrankAccess('ultimate');
    expect(access.source).toBe('live');
    expect(access.canAskOnDemand).toBe(true);
    expect(access.upgradeTo).toBeNull();
  });
});
