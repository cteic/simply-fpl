import type { Metadata, Viewport } from 'next';

import {
  IS_PRODUCTION_SITE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  TWITTER_HANDLE,
} from './site-url';

export interface RobotsDirective {
  index: boolean;
  follow: boolean;
}

export function buildRootRobots(isProductionSite: boolean): RobotsDirective {
  return isProductionSite ? { index: true, follow: true } : { index: false, follow: false };
}

export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'FPL',
    'Fantasy Premier League',
    'live rank',
    'mini-league',
    'FPL price changes',
    'FPL companion',
    'FPL tracker',
  ],
  openGraph: {
    type: 'website',
    url: '/',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  robots: buildRootRobots(IS_PRODUCTION_SITE),
};

export const rootViewport: Viewport = {
  themeColor: '#F7F7F5',
};
