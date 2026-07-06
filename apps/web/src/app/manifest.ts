import type { MetadataRoute } from 'next';

import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '@/lib/site-url';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: `${SITE_NAME} — ${SITE_TAGLINE}. ${SITE_DESCRIPTION}`,
    start_url: '/',
    display: 'standalone',
    background_color: '#F7F7F5',
    theme_color: '#F7F7F5',
    orientation: 'portrait-primary',
    categories: ['sports', 'utilities'],
    icons: [
      {
        src: '/pwa-icon/192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/pwa-icon/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-icon/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
