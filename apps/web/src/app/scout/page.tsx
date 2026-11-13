import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ScoutView } from '@/components/views/scout-view';
import { FEATURE_SCOUT } from '@/lib/feature-flags';

const TITLE = 'Scout';
const DESCRIPTION =
  'Frank watches your FPL squad and flags injuries, suspensions and predicted price moves the moment they matter.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/scout' },
  openGraph: { url: '/scout', type: 'website', title: TITLE, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

export default function ScoutPage() {
  if (!FEATURE_SCOUT) redirect('/');
  return <ScoutView />;
}
