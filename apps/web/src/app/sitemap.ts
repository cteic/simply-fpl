import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/site-url';

interface SitemapRoute {
  path: string;
  changeFrequency: 'daily' | 'weekly' | 'monthly';
  priority: number;
}

export const SITEMAP_ROUTES: readonly SitemapRoute[] = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/leagues', changeFrequency: 'daily', priority: 0.8 },
  { path: '/prices', changeFrequency: 'daily', priority: 0.8 },
  { path: '/h2h', changeFrequency: 'daily', priority: 0.7 },
  { path: '/planner', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/frank', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/vs-livefpl', changeFrequency: 'weekly', priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return SITEMAP_ROUTES.map((route) => ({
    url: route.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
