export const DISALLOWED_PATHS = [
  '/api/',
  '/auth/',
  '/admin/',
  '/brand/',
  '/settings/',
  '/upgrade/',
] as const;

const CONTENT_SIGNALS_PREAMBLE = [
  '# Content Signals Policy — https://developers.cloudflare.com/ai-crawl-control/',
  '# search: search engines building an index and showing links/excerpts',
  '# ai-input: real-time use in generative AI answers (e.g. RAG)',
  '# ai-train: use as training/fine-tuning data',
];

export interface RobotsTxtOptions {
  siteUrl: string;
  isProduction: boolean;
}

export function buildRobotsTxt({ siteUrl, isProduction }: RobotsTxtOptions): string {
  if (!isProduction) {
    return [
      '# Non-production deployment — keep it out of every index.',
      'User-agent: *',
      'Disallow: /',
      '',
    ].join('\n');
  }

  const lines = [
    ...CONTENT_SIGNALS_PREAMBLE,
    'User-agent: *',
    'Content-Signal: search=yes, ai-input=yes, ai-train=no',
    'Allow: /',
    ...DISALLOWED_PATHS.map((path) => `Disallow: ${path}`),
    '',
    `Host: ${siteUrl}`,
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ];

  return lines.join('\n');
}
