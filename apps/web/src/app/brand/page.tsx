import { notFound } from 'next/navigation';

import { BrandSmokeTestView } from './view';

export default function BrandRoute() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <BrandSmokeTestView />;
}
