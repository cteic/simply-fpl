import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { PricesView } from '@/components/views/prices-view';
import { FEATURE_PRICES } from '@/lib/feature-flags';

const TITLE = 'Price Changes';
const DESCRIPTION =
  'Predicted FPL price rises and falls based on live transfer activity. Stay ahead of every value move before deadline.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/prices' },
  openGraph: { url: '/prices', type: 'website', title: TITLE, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

export default function PricesPage() {
  if (!FEATURE_PRICES) redirect('/');
  return <PricesView />;
}
