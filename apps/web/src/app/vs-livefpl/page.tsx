import type { Metadata } from 'next';

import { JsonLd } from '@/components/json-ld';
import { VsLivefplView } from '@/components/views/vs-livefpl-view';
import { buildBreadcrumbSchema } from '@/lib/structured-data';
import { fetchVsData } from '@/queries/vs';

export const metadata: Metadata = {
  title: 'SimplyFPL vs livefpl.net — Speed comparison',
  description:
    'Independent weekly speed measurements comparing SimplyFPL and livefpl.net. Time to first data, page weight, and third-party request count — measured via headless Chrome every Monday.',
  openGraph: {
    title: 'SimplyFPL vs livefpl.net — Speed comparison',
    description:
      'Weekly automated speed comparison: time to first data, page weight, third-party requests. Measured via headless Chrome every Monday.',
    url: '/vs-livefpl',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SimplyFPL vs livefpl.net',
    description: 'Weekly speed comparison measured via headless Chrome.',
  },
  alternates: { canonical: '/vs-livefpl' },
};

export default async function VsLivefplPage() {
  const { snapshot, isFallback } = await fetchVsData();
  return (
    <>
      <JsonLd
        nodes={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'SimplyFPL vs livefpl.net', path: '/vs-livefpl' },
          ]),
        ]}
      />
      <VsLivefplView snapshot={snapshot} isFallback={isFallback} />
    </>
  );
}
