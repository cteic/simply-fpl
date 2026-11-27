import { describe, expect, it } from 'vitest';

import {
  FRANK_QUOTA_FREE,
  FRANK_QUOTA_PRO,
  FRANK_QUOTA_ULTIMATE,
  quotaWindowStart,
  resolveFrankAccess,
} from './access';

describe('resolveFrankAccess', () => {
  it('serves the free tier from the weekly cache with no on-demand access', () => {
    const access = resolveFrankAccess('free');
    expect(access.source).toBe('weekly-cache');
    expect(access.canAskOnDemand).toBe(false);
    expect(access.upgradeTo).toBe('ultimate');
    expect(access.quota).toBeNull();
  });

  it('serves the pro tier from the weekly cache with no on-demand access', () => {
    const access = resolveFrankAccess('pro');
    expect(access.source).toBe('weekly-cache');
    expect(access.canAskOnDemand).toBe(false);
    expect(access.upgradeTo).toBe('ultimate');
    expect(access.quota).toBeNull();
  });

  it('lets the ultimate tier ask live with nothing left to upgrade to', () => {
    const access = resolveFrankAccess('ultimate');
    expect(access.source).toBe('live');
    expect(access.canAskOnDemand).toBe(true);
    expect(access.upgradeTo).toBeNull();
    expect(access.quota).toEqual(FRANK_QUOTA_ULTIMATE);
  });
});

describe('resolveFrankAccess with the free tier switched on', () => {
  const on = { freeTierEnabled: true };

  it('lets a free user ask a few questions a week, with Pro as the upgrade', () => {
    const access = resolveFrankAccess('free', on);
    expect(access.canAskOnDemand).toBe(true);
    expect(access.quota).toEqual(FRANK_QUOTA_FREE);
    expect(access.quota?.period).toBe('week');
    expect(access.upgradeTo).toBe('pro');
  });

  it('gives Pro a monthly allowance well above the free one', () => {
    const access = resolveFrankAccess('pro', on);
    expect(access.canAskOnDemand).toBe(true);
    expect(access.quota).toEqual(FRANK_QUOTA_PRO);
    expect(access.upgradeTo).toBeNull();
  });

  it('leaves Ultimate exactly as it was', () => {
    expect(resolveFrankAccess('ultimate', on)).toEqual(resolveFrankAccess('ultimate'));
  });

  it('stays off unless the flag is exactly true', () => {
    expect(resolveFrankAccess('free', { freeTierEnabled: false }).canAskOnDemand).toBe(false);
    expect(resolveFrankAccess('free', {}).canAskOnDemand).toBe(false);
  });
});

describe('quotaWindowStart', () => {
  it('opens a monthly window on the first of the month at midnight UTC', () => {
    const start = quotaWindowStart('month', new Date('2026-11-27T15:04:05Z'));
    expect(start.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });

  it('opens a weekly window on the most recent Monday', () => {
    // 27 November 2026 is a Friday.
    const start = quotaWindowStart('week', new Date('2026-11-27T15:04:05Z'));
    expect(start.toISOString()).toBe('2026-11-23T00:00:00.000Z');
  });

  it('treats Monday itself as the start of its own week', () => {
    const start = quotaWindowStart('week', new Date('2026-11-23T00:00:01Z'));
    expect(start.toISOString()).toBe('2026-11-23T00:00:00.000Z');
  });

  it('puts Sunday at the end of the week that began six days earlier', () => {
    const start = quotaWindowStart('week', new Date('2026-11-29T23:59:59Z'));
    expect(start.toISOString()).toBe('2026-11-23T00:00:00.000Z');
  });

  it('crosses a month boundary without losing the week', () => {
    // Tuesday 1 December 2026: the week began on Monday 30 November.
    const start = quotaWindowStart('week', new Date('2026-12-01T09:00:00Z'));
    expect(start.toISOString()).toBe('2026-11-30T00:00:00.000Z');
  });
});
