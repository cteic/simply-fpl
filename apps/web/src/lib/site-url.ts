export const PRODUCTION_SITE_URL = 'https://simplyfpl.com';

const DEVELOPMENT_SITE_URL = 'http://localhost:3000';

export interface SiteUrlEnv {
  NEXT_PUBLIC_SITE_URL?: string | undefined;
  NODE_ENV?: string | undefined;
}

export function resolveSiteUrl(env: SiteUrlEnv): string {
  const explicit = env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  return env.NODE_ENV === 'production' ? PRODUCTION_SITE_URL : DEVELOPMENT_SITE_URL;
}

export function isProductionSiteUrl(siteUrl: string): boolean {
  return siteUrl.replace(/\/+$/, '') === PRODUCTION_SITE_URL;
}

export const SITE_URL = resolveSiteUrl({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NODE_ENV: process.env.NODE_ENV,
});

export const IS_PRODUCTION_SITE = isProductionSiteUrl(SITE_URL);

export const SITE_NAME = 'SimplyFPL';

export const SITE_TAGLINE = 'Fastest live-rank companion for Fantasy Premier League';

export const SITE_DESCRIPTION =
  'Track your FPL gameweek rank as it changes, watch mini-leagues update live, and compare head-to-head against any rival — fast, free, no signup.';

export const TWITTER_HANDLE = '@simplyfpl';
