import { describe, expect, it } from 'vitest';

import { serializeJsonLd } from '@/components/json-ld';

import {
  buildBreadcrumbSchema,
  buildOrganizationSchema,
  buildPriceChangesDatasetSchema,
  buildWebApplicationSchema,
  buildWebSiteSchema,
  currentSeasonLabel,
} from './structured-data';

describe('Organization schema', () => {
  it('declares the schema.org context and an absolute url', () => {
    const node = buildOrganizationSchema();
    expect(node['@context']).toBe('https://schema.org');
    expect(node['@type']).toBe('Organization');
    expect(node['name']).toBe('SimplyFPL');
    expect(String(node['url'])).toMatch(/^https?:\/\//);
    expect(Array.isArray(node['sameAs'])).toBe(true);
  });
});

describe('WebSite schema', () => {
  it('omits SearchAction because the site has no URL-addressable search', () => {
    const node = buildWebSiteSchema();
    expect(node['@type']).toBe('WebSite');
    expect(node['potentialAction']).toBeUndefined();
  });
});

describe('WebApplication schema', () => {
  it('describes the app category and platform', () => {
    const node = buildWebApplicationSchema();
    expect(node['@type']).toBe('WebApplication');
    expect(node['applicationCategory']).toBe('SportsApplication');
    expect(node['operatingSystem']).toBe('Web');
  });

  it('reflects the real freemium pricing and claims no ratings', () => {
    const node = buildWebApplicationSchema();
    const offers = node['offers'];
    expect(Array.isArray(offers)).toBe(true);
    const serialized = JSON.stringify(offers);
    expect(serialized).toContain('"price":"0"');
    expect(serialized).toContain('"price":"4"');
    expect(serialized).toContain('"price":"25"');
    expect(serialized).toContain('"priceCurrency":"EUR"');
    expect(node['aggregateRating']).toBeUndefined();
    expect(node['review']).toBeUndefined();
  });
});

describe('BreadcrumbList schema', () => {
  it('numbers crumbs from one and resolves absolute item urls', () => {
    const node = buildBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Price Changes', path: '/prices' },
    ]);
    expect(node['@type']).toBe('BreadcrumbList');
    const items = node['itemListElement'];
    expect(Array.isArray(items)).toBe(true);
    const serialized = JSON.stringify(items);
    expect(serialized).toContain('"position":1');
    expect(serialized).toContain('"position":2');
    expect(serialized).toContain('/prices');
  });
});

describe('Dataset schema for /prices', () => {
  const node = buildPriceChangesDatasetSchema(new Date('2026-08-18T00:00:00Z'));

  it('is a Dataset with temporal coverage for the current season', () => {
    expect(node['@type']).toBe('Dataset');
    expect(node['temporalCoverage']).toBe('2026-07-01/2027-06-30');
  });

  it('exposes distributions pointing at the public page and the MCP endpoint', () => {
    const serialized = JSON.stringify(node['distribution']);
    expect(serialized).toContain('DataDownload');
    expect(serialized).toContain('/prices');
    expect(serialized).toContain('/mcp');
  });

  it('is marked as freely accessible', () => {
    expect(node['isAccessibleForFree']).toBe(true);
  });
});

describe('currentSeasonLabel', () => {
  it('rolls the season over at the start of July', () => {
    expect(currentSeasonLabel(new Date('2026-06-30T00:00:00Z'))).toBe('2025-07-01/2026-06-30');
    expect(currentSeasonLabel(new Date('2026-07-01T00:00:00Z'))).toBe('2026-07-01/2027-06-30');
  });
});

describe('serializeJsonLd', () => {
  it('emits a single object for one node and an array for many', () => {
    expect(serializeJsonLd([buildOrganizationSchema()]).startsWith('{')).toBe(true);
    expect(serializeJsonLd([buildOrganizationSchema(), buildWebSiteSchema()]).startsWith('[')).toBe(
      true
    );
  });

  it('escapes < so the payload cannot break out of the script tag', () => {
    const escaped = serializeJsonLd([
      buildBreadcrumbSchema([{ name: '</script><img src=x>', path: '/' }]),
    ]);
    expect(escaped).not.toContain('</script>');
    expect(escaped).toContain('\\u003c');
  });
});
