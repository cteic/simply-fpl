import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BrandSmokeTestView } from './view';

export const metadata: Metadata = {
  title: 'Brand smoke test',
  description: 'Internal brand and design-token smoke test. Not part of the public site.',
  robots: { index: false, follow: false },
};

export default function BrandRoute() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <BrandSmokeTestView />;
}
