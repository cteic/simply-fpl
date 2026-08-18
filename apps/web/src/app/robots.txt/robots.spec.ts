import { describe, expect, it } from 'vitest';

import { DISALLOWED_PATHS, buildRobotsTxt } from './build-robots-txt';

const PROD = { siteUrl: 'https://simplyfpl.com', isProduction: true };

describe('robots.txt on the production domain', () => {
  it('emits the Content Signals directive', () => {
    const body = buildRobotsTxt(PROD);
    expect(body).toContain('Content-Signal: search=yes, ai-input=yes, ai-train=no');
  });

  it('allows crawling and points at the sitemap on the launch domain', () => {
    const body = buildRobotsTxt(PROD);
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Allow: /');
    expect(body).toContain('Sitemap: https://simplyfpl.com/sitemap.xml');
    expect(body).not.toContain('pages.dev');
  });

  it('disallows the private and internal areas', () => {
    const body = buildRobotsTxt(PROD);
    for (const path of DISALLOWED_PATHS) {
      expect(body).toContain(`Disallow: ${path}`);
    }
    expect(DISALLOWED_PATHS).toContain('/admin/');
    expect(DISALLOWED_PATHS).toContain('/brand/');
    expect(DISALLOWED_PATHS).toContain('/settings/');
    expect(DISALLOWED_PATHS).toContain('/upgrade/');
    expect(DISALLOWED_PATHS).toContain('/auth/');
    expect(DISALLOWED_PATHS).toContain('/api/');
  });

  it('does not disallow the MCP endpoint', () => {
    expect(buildRobotsTxt(PROD)).not.toContain('Disallow: /mcp');
  });
});

describe('robots.txt on a preview or staging deployment', () => {
  it('blocks everything', () => {
    const body = buildRobotsTxt({
      siteUrl: 'https://dev.simply-fpl.pages.dev',
      isProduction: false,
    });
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Disallow: /');
    expect(body).not.toContain('Allow: /');
    expect(body).not.toContain('Sitemap:');
  });
});
