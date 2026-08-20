import { describe, expect, it } from 'vitest';

import { PRODUCTION_SITE_URL, isProductionSiteUrl, resolveSiteUrl } from './site-url';

describe('resolveSiteUrl', () => {
  it('falls back to the launch domain in production', () => {
    expect(resolveSiteUrl({ NODE_ENV: 'production' })).toBe('https://simplyfpl.com');
    expect(PRODUCTION_SITE_URL).toBe('https://simplyfpl.com');
  });

  it('never falls back to the pages.dev deployment alias', () => {
    expect(resolveSiteUrl({ NODE_ENV: 'production' })).not.toContain('pages.dev');
  });

  it('falls back to localhost outside production', () => {
    expect(resolveSiteUrl({ NODE_ENV: 'development' })).toBe('http://localhost:3000');
    expect(resolveSiteUrl({})).toBe('http://localhost:3000');
  });

  it('prefers an explicit NEXT_PUBLIC_SITE_URL and strips trailing slashes', () => {
    expect(
      resolveSiteUrl({
        NEXT_PUBLIC_SITE_URL: 'https://preview.example.dev/',
        NODE_ENV: 'production',
      })
    ).toBe('https://preview.example.dev');
  });
});

describe('isProductionSiteUrl', () => {
  it('is true only for the launch domain', () => {
    expect(isProductionSiteUrl('https://simplyfpl.com')).toBe(true);
    expect(isProductionSiteUrl('https://simplyfpl.com/')).toBe(true);
    expect(isProductionSiteUrl('https://simply-fpl.pages.dev')).toBe(false);
    expect(isProductionSiteUrl('http://localhost:3000')).toBe(false);
  });
});
