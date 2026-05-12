import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/auth/', '/api/'],
      },
    ],
    sitemap: 'https://simplyfpl.com/sitemap.xml',
  };
}
