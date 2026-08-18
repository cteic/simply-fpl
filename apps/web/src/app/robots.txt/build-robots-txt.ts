export const DISALLOWED_PATHS = [
  '/api/',
  '/auth/',
  '/admin/',
  '/brand/',
  '/settings/',
  '/upgrade/',
] as const;

/**
 * Crawlers whose declared purpose is collecting corpora for model training.
 * They get a hard `Disallow: /` group, because per-bot groups win over the
 * `User-agent: *` group in every conforming robots.txt parser.
 */
export const TRAINING_ONLY_CRAWLERS = [
  'CCBot',
  'Bytespider',
  'Amazonbot',
  'meta-externalagent',
  'Applebot-Extended',
] as const;

/**
 * Crawlers that feed search, citation and retrieval-time grounding. Left
 * allowed on purpose — blocking them removes SimplyFPL from AI answers.
 */
export const CITATION_CRAWLERS = [
  'ClaudeBot',
  'Google-Extended',
  'GPTBot',
  'OAI-SearchBot',
  'PerplexityBot',
] as const;

const CONTENT_SIGNALS_PREAMBLE = [
  '# Content Signals Policy — https://developers.cloudflare.com/ai-crawl-control/',
  '#',
  '# As a condition of accessing this website, you agree to abide by the',
  '# following content signals:',
  '#',
  '# (a)  If a Content-Signal = yes, you may collect content for the',
  '#      corresponding use.',
  '# (b)  If a Content-Signal = no, you may not collect content for the',
  '#      corresponding use.',
  '# (c)  If the website operator does not include a Content-Signal for a',
  '#      corresponding use, the website operator neither grants nor restricts',
  '#      permission via Content-Signal with respect to the corresponding use.',
  '#',
  '# The content signals and their meanings are:',
  '#',
  '# search:   building a search index and providing search results (e.g.,',
  "#           returning hyperlinks and short excerpts from this website's",
  '#           contents). Search does not include providing AI-generated search',
  '#           summaries.',
  '# ai-input: inputting content into one or more AI models (e.g., retrieval',
  '#           augmented generation, grounding, or other real-time taking of',
  '#           content for generative AI search answers).',
  '# ai-train: training or fine-tuning AI models.',
  '#',
  '# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS RESERVATIONS OF',
  '# RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN UNION DIRECTIVE 2019/790 ON COPYRIGHT',
  '# AND RELATED RIGHTS IN THE DIGITAL SINGLE MARKET.',
];

const CITATION_CRAWLER_NOTE = [
  '# Search, citation and grounding crawlers are allowed on purpose:',
  `# ${CITATION_CRAWLERS.join(', ')}.`,
  '# Do not add Disallow groups for them — being cited in AI answers is the',
  '# point. ai-train=no above is what reserves training rights.',
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

  const trainingCrawlerGroups = TRAINING_ONLY_CRAWLERS.flatMap((userAgent) => [
    `User-agent: ${userAgent}`,
    'Disallow: /',
    '',
  ]);

  const lines = [
    ...CONTENT_SIGNALS_PREAMBLE,
    '',
    'User-agent: *',
    'Content-Signal: search=yes, ai-input=yes, ai-train=no',
    'Allow: /',
    ...DISALLOWED_PATHS.map((path) => `Disallow: ${path}`),
    '',
    '# Training-only crawlers — no search or citation benefit, so no access.',
    ...trainingCrawlerGroups,
    ...CITATION_CRAWLER_NOTE,
    '',
    `Host: ${siteUrl}`,
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ];

  return lines.join('\n');
}
