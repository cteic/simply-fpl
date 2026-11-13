import { describe, expect, it } from 'vitest';

import {
  CITATION_CRAWLERS,
  DISALLOWED_PATHS,
  TRAINING_ONLY_CRAWLERS,
  buildRobotsTxt,
} from './build-robots-txt';

const PROD = { siteUrl: 'https://simplyfpl.com', isProduction: true };

describe('robots.txt on the production domain', () => {
  it('emits the Content Signals directive with all three signal values', () => {
    const body = buildRobotsTxt(PROD);
    expect(body).toContain('Content-Signal: search=yes, ai-input=yes, ai-train=no');
    expect(body).toMatch(/Content-Signal:[^\n]*\bsearch=yes\b/);
    expect(body).toMatch(/Content-Signal:[^\n]*\bai-input=yes\b/);
    expect(body).toMatch(/Content-Signal:[^\n]*\bai-train=no\b/);
  });

  it('carries the express reservation of rights under the EU copyright directive', () => {
    const body = buildRobotsTxt(PROD);
    expect(body).toContain(
      '# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS RESERVATIONS OF'
    );
    expect(body).toContain(
      '# RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN UNION DIRECTIVE 2019/790 ON COPYRIGHT'
    );
    expect(body).toContain('# AND RELATED RIGHTS IN THE DIGITAL SINGLE MARKET.');
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

function blockedUserAgents(body: string): string[] {
  const blocked: string[] = [];
  const lines = body.split('\n');
  lines.forEach((line, index) => {
    const match = /^User-agent: (.+)$/.exec(line);
    if (match && match[1] && lines[index + 1] === 'Disallow: /') {
      blocked.push(match[1]);
    }
  });
  return blocked;
}

describe('per-crawler groups, now that the app owns robots.txt', () => {
  const body = buildRobotsTxt(PROD);

  it.each(TRAINING_ONLY_CRAWLERS)('blocks the training-only crawler %s', (userAgent) => {
    expect(body).toContain(`User-agent: ${userAgent}`);
    expect(blockedUserAgents(body)).toContain(userAgent);
  });

  it.each(CITATION_CRAWLERS)('leaves the citation crawler %s unblocked', (userAgent) => {
    expect(blockedUserAgents(body)).not.toContain(userAgent);
  });

  it('never blocks ClaudeBot or Google-Extended', () => {
    const blocked = blockedUserAgents(body);
    expect(blocked).not.toContain('ClaudeBot');
    expect(blocked).not.toContain('Google-Extended');
  });

  it('blocks nothing beyond the training-only list', () => {
    expect(blockedUserAgents(body).sort()).toEqual([...TRAINING_ONLY_CRAWLERS].sort());
  });

  it('explains in the emitted file why the citation crawlers stay allowed', () => {
    expect(body).toContain('Search, citation and grounding crawlers are allowed on purpose');
    expect(body).toContain('ClaudeBot');
    expect(body).toContain('Google-Extended');
  });

  it('drops the Cloudflare-internal crawler now that the managed file is gone', () => {
    expect(body).not.toContain('CloudflareBrowserRenderingCrawler');
  });

  it('keeps the sitemap reference last', () => {
    const trimmed = body.trimEnd().split('\n');
    expect(trimmed[trimmed.length - 1]).toBe('Sitemap: https://simplyfpl.com/sitemap.xml');
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
