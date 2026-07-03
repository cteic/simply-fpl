/**
 * Build-time feature flags.
 *
 * Each flag is gated on a `NEXT_PUBLIC_FEATURE_*` env var that must equal the
 * literal string `'true'` for the feature to be enabled. Unset / any other
 * value = disabled. Flags are inlined at build time (no runtime fetch), so
 * toggling them = redeploy.
 *
 * Why a hard env-var flag instead of LaunchDarkly etc:
 *   - We only need binary on/off, no audience targeting or experiments yet
 *   - SDK adds bundle weight, which fights the launch speed/reliability USP
 *   - Cloudflare Pages env vars are per-environment (Prod/Preview) already
 *
 * If/when we want runtime flags or A/B tests, swap this module for a
 * provider client and the call sites stay the same.
 */

export const FEATURE_AUTH = process.env.NEXT_PUBLIC_FEATURE_AUTH === 'true';
export const FEATURE_PRICES = process.env.NEXT_PUBLIC_FEATURE_PRICES === 'true';
export const FEATURE_PLANNER = process.env.NEXT_PUBLIC_FEATURE_PLANNER === 'true';
export const FEATURE_ADS = process.env.NEXT_PUBLIC_FEATURE_ADS === 'true';
export const SHOW_AD_PLACEHOLDERS = process.env.NEXT_PUBLIC_SHOW_AD_PLACEHOLDERS === 'true';
export const FEATURE_FRANK_ONDEMAND = process.env.NEXT_PUBLIC_FEATURE_FRANK_ONDEMAND === 'true';
export const FEATURE_WEB_PUSH = process.env.NEXT_PUBLIC_FEATURE_WEB_PUSH === 'true';
export const FEATURE_NEWS = process.env.NEXT_PUBLIC_FEATURE_NEWS === 'true';
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
