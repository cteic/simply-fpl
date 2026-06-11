export const ANALYTICS_FEATURE = {
  LIVE_RANK: 'live_rank',
  LEAGUES: 'leagues',
  RIVALS: 'rivals',
  H2H: 'h2h',
  PRICES: 'prices',
  PLANNER: 'planner',
  FRANK: 'frank',
  REPLAY: 'replay',
} as const;

export type AnalyticsFeature = (typeof ANALYTICS_FEATURE)[keyof typeof ANALYTICS_FEATURE];

export const ANALYTICS_EVENT = {
  PAGE_VIEWED: 'page_viewed',
  FEATURE_USED: 'feature_used',
  TIER_UPGRADE_STARTED: 'tier_upgrade_started',
  TIER_UPGRADE_COMPLETED: 'tier_upgrade_completed',
  FRANK_QUERY_SENT: 'frank_query_sent',
  NOTIFICATION_OPT_IN_SHOWN: 'notification_opt_in_shown',
  NOTIFICATION_OPT_IN_ACCEPTED: 'notification_opt_in_accepted',
  NOTIFICATION_OPT_IN_DISMISSED: 'notification_opt_in_dismissed',
  ERROR_BOUNDARY_TRIGGERED: 'error_boundary_triggered',
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENT)[keyof typeof ANALYTICS_EVENT];

// Strips numeric path segments so FPL entry/league IDs never reach PostHog.
// /rivals/12345 → /rivals/:id   /h2h/99/vs/101 → /h2h/:id/vs/:id
export function sanitizePath(path: string): string {
  return path.replace(/\/\d+/g, '/:id');
}

// SHA-256 of (salt + userId) using the Web Crypto API.
// Always called server-side via /api/analytics/identity so the salt stays private.
export async function hashUserId(salt: string, userId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + userId);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
