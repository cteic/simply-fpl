import { redirect } from 'next/navigation';

import { PricesView } from '@/components/views/prices-view';
import { FEATURE_PRICES } from '@/lib/feature-flags';

export default function PricesPage() {
  if (!FEATURE_PRICES) redirect('/');
  return <PricesView />;
}

export const metadata = {
  title: 'Price Changes — SimplyFPL',
  description: 'Predicted FPL price rises and falls based on live transfer activity.',
};
