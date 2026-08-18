import type { Metadata } from 'next';

import { JsonLd } from '@/components/json-ld';
import { HeadToHeadView } from '@/components/views/head-to-head-view';
import { buildBreadcrumbSchema } from '@/lib/structured-data';

const TITLE = 'Head to Head';
const DESCRIPTION =
  'Compare two FPL managers side-by-side — captain choice, differential picks, live points and projected score.';

export default function HeadToHeadPage() {
  return (
    <>
      <JsonLd
        nodes={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: TITLE, path: '/h2h' },
          ]),
        ]}
      />
      <HeadToHeadView />
    </>
  );
}

export function generateMetadata(): Metadata {
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: '/h2h' },
    openGraph: { url: '/h2h', type: 'website', title: TITLE, description: DESCRIPTION },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
  };
}
