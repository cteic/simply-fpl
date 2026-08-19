import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from './site-url';

export type JsonLdValue = string | number | boolean | null | JsonLdNode | readonly JsonLdValue[];

export interface JsonLdNode {
  readonly [key: string]: JsonLdValue | undefined;
}

export interface StructuredDataNode extends JsonLdNode {
  readonly '@context': 'https://schema.org';
  readonly '@type': string;
}

function absoluteUrl(path: string): string {
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

export const SOCIAL_PROFILE_URLS: readonly string[] = ['https://x.com/simplyfpl'];

export function buildOrganizationSchema(): StructuredDataNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: absoluteUrl('/'),
    logo: `${SITE_URL}/pwa-icon/512`,
    description: SITE_DESCRIPTION,
    sameAs: SOCIAL_PROFILE_URLS,
  };
}

export function buildWebSiteSchema(): StructuredDataNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: SITE_TAGLINE,
    url: absoluteUrl('/'),
    description: SITE_DESCRIPTION,
    inLanguage: 'en-GB',
    publisher: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
  };
}

export interface OfferInput {
  name: string;
  price: string;
  billingDuration: string;
}

export const PRICING_OFFERS: readonly OfferInput[] = [
  { name: 'Free', price: '0', billingDuration: 'P1M' },
  { name: 'Pro monthly', price: '4', billingDuration: 'P1M' },
  { name: 'Pro yearly', price: '25', billingDuration: 'P1Y' },
];

export function buildWebApplicationSchema(): StructuredDataNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: absoluteUrl('/'),
    description: SITE_DESCRIPTION,
    applicationCategory: 'SportsApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript.',
    inLanguage: 'en-GB',
    featureList: [
      'Live gameweek rank estimate',
      'Live mini-league standings',
      'Head-to-head manager comparison',
      'FPL price-change predictions',
      'Transfer planner',
    ],
    offers: PRICING_OFFERS.map((offer) => ({
      '@type': 'Offer',
      name: offer.name,
      price: offer.price,
      priceCurrency: 'EUR',
      category: offer.price === '0' ? 'free' : 'subscription',
      billingDuration: offer.billingDuration,
      url: absoluteUrl('/upgrade'),
    })),
    publisher: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
  };
}

export interface BreadcrumbCrumb {
  name: string;
  path: string;
}

export function buildBreadcrumbSchema(crumbs: readonly BreadcrumbCrumb[]): StructuredDataNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export interface DatasetDistribution {
  contentUrl: string;
  encodingFormat: string;
}

export interface DatasetInput {
  name: string;
  description: string;
  path: string;
  keywords: readonly string[];
  temporalCoverage: string;
  distributions: readonly DatasetDistribution[];
}

export function buildDatasetSchema(input: DatasetInput): StructuredDataNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    inLanguage: 'en-GB',
    keywords: input.keywords,
    temporalCoverage: input.temporalCoverage,
    creator: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
    distribution: input.distributions.map((distribution) => ({
      '@type': 'DataDownload',
      encodingFormat: distribution.encodingFormat,
      contentUrl: distribution.contentUrl,
    })),
  };
}

export function currentSeasonLabel(now: Date): string {
  const year = now.getUTCFullYear();
  const startYear = now.getUTCMonth() >= 6 ? year : year - 1;
  return `${startYear}-07-01/${startYear + 1}-06-30`;
}

export function buildPriceChangesDatasetSchema(now: Date): StructuredDataNode {
  return buildDatasetSchema({
    name: 'SimplyFPL price-change predictions',
    description:
      'Daily predicted Fantasy Premier League player price rises and falls, derived from live net-transfer activity across the whole FPL player base.',
    path: '/prices',
    keywords: [
      'Fantasy Premier League',
      'FPL price changes',
      'price predictions',
      'player transfers',
    ],
    temporalCoverage: currentSeasonLabel(now),
    distributions: [
      { contentUrl: absoluteUrl('/prices'), encodingFormat: 'text/html' },
      { contentUrl: absoluteUrl('/mcp'), encodingFormat: 'application/json' },
    ],
  });
}
