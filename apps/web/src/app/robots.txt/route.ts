import { IS_PRODUCTION_SITE, SITE_URL } from '@/lib/site-url';

import { buildRobotsTxt } from './build-robots-txt';

export const dynamic = 'force-static';

export function GET(): Response {
  return new Response(buildRobotsTxt({ siteUrl: SITE_URL, isProduction: IS_PRODUCTION_SITE }), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
