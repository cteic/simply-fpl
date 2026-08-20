import type { Metadata } from 'next';

import { JsonLd } from '@/components/json-ld';
import { FrankView } from '@/components/views/frank-view';
import { buildBreadcrumbSchema } from '@/lib/structured-data';

export const metadata: Metadata = {
  title: 'Frank — AI FPL Coach',
  description:
    'Weekly AI-powered captain picks, transfer targets, and chip advice for your FPL team.',
  alternates: { canonical: '/frank' },
  openGraph: {
    url: '/frank',
    type: 'website',
    title: 'Frank — AI FPL Coach',
    description:
      'Weekly AI-powered captain picks, transfer targets, and chip advice for your FPL team.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Frank — AI FPL Coach',
    description:
      'Weekly AI-powered captain picks, transfer targets, and chip advice for your FPL team.',
  },
};

export default function FrankPage() {
  return (
    <>
      <JsonLd
        nodes={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Frank', path: '/frank' },
          ]),
        ]}
      />
      <FrankView />
    </>
  );
}
