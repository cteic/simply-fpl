import { describe, expect, it } from 'vitest';

import { rootMetadata } from '@/lib/metadata';

import { metadata as homeMetadata } from './page';
import robots from './robots';
import sitemap from './sitemap';

describe('root layout metadata', () => {
  it('declares twitter, openGraph and a canonical alternate', () => {
    expect(rootMetadata.twitter).toMatchObject({ card: 'summary_large_image' });
    expect(rootMetadata.openGraph).toMatchObject({ type: 'website' });
    expect(rootMetadata.alternates).toMatchObject({ canonical: '/' });
    expect(rootMetadata.metadataBase).toBeInstanceOf(URL);
  });
});

describe('home page metadata', () => {
  it('returns the expected shape for /', () => {
    expect(typeof homeMetadata.title).toBe('string');
    const title = homeMetadata.title as string;
    const description = homeMetadata.description ?? '';
    expect(title.length).toBeGreaterThan(0);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(description.length).toBeGreaterThan(0);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(homeMetadata.alternates).toMatchObject({ canonical: '/' });
    expect(homeMetadata.twitter).toMatchObject({ card: 'summary_large_image' });
    expect(homeMetadata.openGraph).toMatchObject({ url: '/', type: 'website' });
  });
});

describe('sitemap', () => {
  it('lists the indexable public routes', () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.endsWith('/'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/leagues'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/prices'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/planner'))).toBe(true);
    for (const entry of entries) {
      expect(entry.lastModified).toBeInstanceOf(Date);
    }
  });
});

describe('robots', () => {
  it('allows search bots and references the sitemap', () => {
    const result = robots();
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const first = rules[0];
    expect(first).toBeDefined();
    expect(first?.userAgent).toBe('*');
    expect(first?.allow).toBe('/');
    expect(first?.disallow).toContain('/auth/');
    expect(first?.disallow).toContain('/api/');
  });
});

describe('og image config', () => {
  it('exports a 1200x630 OG_SIZE and image/png content type', async () => {
    const mod = await import('./og/og-config');
    expect(mod.OG_SIZE).toEqual({ width: 1200, height: 630 });
    expect(mod.OG_CONTENT_TYPE).toBe('image/png');
  });
});
