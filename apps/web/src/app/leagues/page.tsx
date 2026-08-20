import type { Metadata } from 'next';

import { JsonLd } from '@/components/json-ld';
import { LeaguesShowcase } from '@/components/views/leagues-showcase';
import { buildBreadcrumbSchema } from '@/lib/structured-data';

const TITLE = 'My Leagues';
const DESCRIPTION =
  'Live mini-league standings for your FPL team — switch between each of your leagues and jump into a head-to-head.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/leagues' },
  openGraph: { url: '/leagues', type: 'website', title: TITLE, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

export default function LeaguesPage() {
  return (
    <>
      <JsonLd
        nodes={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: TITLE, path: '/leagues' },
          ]),
        ]}
      />
      <LeaguesShowcase />
    </>
  );
}
