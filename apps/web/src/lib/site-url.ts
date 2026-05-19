export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'https://simply-fpl.pages.dev'
    : 'http://localhost:3000');

export const SITE_NAME = 'SimplyFPL';

export const SITE_TAGLINE = 'Fastest live-rank companion for Fantasy Premier League';

export const SITE_DESCRIPTION =
  'Track your FPL gameweek rank as it changes, watch mini-leagues update live, and compare head-to-head against any rival — fast, free, no signup.';

export const TWITTER_HANDLE = '@simplyfpl';
