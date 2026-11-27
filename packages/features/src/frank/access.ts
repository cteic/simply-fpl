import type { Tier } from '@simplyfpl/types';

export type FrankSource = 'weekly-cache' | 'live';

export type FrankQuotaPeriod = 'week' | 'month';

/** How many questions a tier may ask, and over what window. */
export interface FrankQuota {
  period: FrankQuotaPeriod;
  /** Where the UI starts warning. */
  soft: number;
  /** Where the route refuses. */
  hard: number;
}

export interface FrankAccess {
  tier: Tier;
  source: FrankSource;
  canAskOnDemand: boolean;
  upgradeTo: Tier | null;
  /** Null when the tier cannot ask at all. */
  quota: FrankQuota | null;
}

export interface FrankAccessOptions {
  /**
   * Open on-demand questions to free and Pro. Off by default, so turning it on
   * is a decision rather than a side effect of a deploy.
   *
   * The reasoning is in docs/notes/frank-monetisation-plan.md: a question costs
   * about a fortieth of a cent, so questions are worth more as the thing people
   * try than as the thing they pay for.
   */
  freeTierEnabled?: boolean;
}

/** What Ultimate has always had. */
export const FRANK_QUOTA_ULTIMATE: FrankQuota = { period: 'month', soft: 50, hard: 80 };

/** Three a week: enough to find it useful, few enough to want more. */
export const FRANK_QUOTA_FREE: FrankQuota = { period: 'week', soft: 2, hard: 3 };

/** Generous enough that a paying user never meets a counter. */
export const FRANK_QUOTA_PRO: FrankQuota = { period: 'month', soft: 120, hard: 150 };

export function resolveFrankAccess(tier: Tier, options: FrankAccessOptions = {}): FrankAccess {
  if (tier === 'ultimate') {
    return {
      tier,
      source: 'live',
      canAskOnDemand: true,
      upgradeTo: null,
      quota: FRANK_QUOTA_ULTIMATE,
    };
  }

  if (options.freeTierEnabled === true) {
    if (tier === 'pro') {
      return {
        tier,
        source: 'live',
        canAskOnDemand: true,
        upgradeTo: null,
        quota: FRANK_QUOTA_PRO,
      };
    }
    return {
      tier,
      source: 'live',
      canAskOnDemand: true,
      upgradeTo: 'pro',
      quota: FRANK_QUOTA_FREE,
    };
  }

  return {
    tier,
    source: 'weekly-cache',
    canAskOnDemand: false,
    upgradeTo: 'ultimate',
    quota: null,
  };
}

/**
 * The UTC instant a quota window opened: the first of the month, or the most
 * recent Monday. Weeks start on Monday so the allowance resets before the
 * midweek deadline rush rather than in the middle of a Sunday's matches.
 */
export function quotaWindowStart(period: FrankQuotaPeriod, now: Date = new Date()): Date {
  const start = new Date(now.getTime());
  start.setUTCHours(0, 0, 0, 0);
  if (period === 'month') {
    start.setUTCDate(1);
    return start;
  }
  // getUTCDay: Sunday is 0, Monday is 1. Days since the last Monday.
  const sinceMonday = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - sinceMonday);
  return start;
}
