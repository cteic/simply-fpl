import { describe, expect, it } from 'vitest';

import { buildRootRobots, rootMetadata } from '@/lib/metadata';

import { metadata as brandMetadata } from './brand/page';
import { metadata as frankMetadata } from './frank/page';
import { generateMetadata as h2hMetadata } from './h2h/page';
import { metadata as leaguesMetadata } from './leagues/page';
import { metadata as loginMetadata } from './login/page';
import { metadata as homeMetadata } from './page';
import { metadata as plannerMetadata } from './planner/page';
import { metadata as pricesMetadata } from './prices/page';
import { metadata as replayMetadata } from './replay/page';
import { generateMetadata as rivalsMetadata } from './rivals/[leagueId]/page';
import { metadata as settingsMetadata } from './settings/page';
import sitemap, { SITEMAP_ROUTES } from './sitemap';
import { metadata as upgradeMetadata } from './upgrade/page';
import { metadata as vsLivefplMetadata } from './vs-livefpl/page';

describe('root layout metadata', () => {
  it('declares twitter, openGraph and a canonical alternate', () => {
    expect(rootMetadata.twitter).toMatchObject({ card: 'summary_large_image' });
    expect(rootMetadata.openGraph).toMatchObject({ type: 'website' });
    expect(rootMetadata.metadataBase).toBeInstanceOf(URL);
  });

  it('does not declare a canonical, so pages cannot inherit the homepage URL', () => {
    expect(rootMetadata.alternates?.canonical).toBeUndefined();
  });

  it('only allows indexing on the production domain', () => {
    expect(buildRootRobots(true)).toEqual({ index: true, follow: true });
    expect(buildRootRobots(false)).toEqual({ index: false, follow: false });
  });
});

describe('per-page canonicals', () => {
  const selfReferencing: Array<[string, string]> = [
    ['/', String(homeMetadata.alternates?.canonical)],
    ['/leagues', String(leaguesMetadata.alternates?.canonical)],
    ['/prices', String(pricesMetadata.alternates?.canonical)],
    ['/planner', String(plannerMetadata.alternates?.canonical)],
    ['/frank', String(frankMetadata.alternates?.canonical)],
    ['/h2h', String(h2hMetadata().alternates?.canonical)],
    ['/vs-livefpl', String(vsLivefplMetadata.alternates?.canonical)],
    ['/replay', String(replayMetadata.alternates?.canonical)],
    ['/login', String(loginMetadata.alternates?.canonical)],
    ['/settings', String(settingsMetadata.alternates?.canonical)],
    ['/upgrade', String(upgradeMetadata.alternates?.canonical)],
  ];

  it.each(selfReferencing)('%s canonicalises to itself', (route, canonical) => {
    expect(canonical).toBe(route);
  });
});

describe('non-public pages', () => {
  it('are marked noindex', () => {
    expect(brandMetadata.robots).toMatchObject({ index: false, follow: false });
    expect(settingsMetadata.robots).toMatchObject({ index: false, follow: false });
    expect(upgradeMetadata.robots).toMatchObject({ index: false, follow: false });
    expect(loginMetadata.robots).toMatchObject({ index: false, follow: false });
    expect(replayMetadata.robots).toMatchObject({ index: false, follow: false });
    expect(rivalsMetadata().robots).toMatchObject({ index: false, follow: false });
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
  const paths = SITEMAP_ROUTES.map((route) => route.path);

  it('lists every indexable public route', () => {
    expect(paths).toEqual(
      expect.arrayContaining([
        '/',
        '/leagues',
        '/prices',
        '/planner',
        '/h2h',
        '/vs-livefpl',
        '/frank',
      ])
    );
  });

  it('excludes private, internal and noindex routes', () => {
    for (const excluded of [
      '/login',
      '/settings',
      '/upgrade',
      '/brand',
      '/replay',
      '/admin/frank',
    ]) {
      expect(paths).not.toContain(excluded);
    }
  });

  it('emits absolute URLs with a lastModified date', () => {
    for (const entry of sitemap()) {
      expect(entry.url).toMatch(/^https?:\/\//);
      expect(entry.lastModified).toBeInstanceOf(Date);
    }
  });
});

describe('og image config', () => {
  it('exports a 1200x630 OG_SIZE and image/png content type', async () => {
    const mod = await import('./og/og-config');
    expect(mod.OG_SIZE).toEqual({ width: 1200, height: 630 });
    expect(mod.OG_CONTENT_TYPE).toBe('image/png');
  });
});
