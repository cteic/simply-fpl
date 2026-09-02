import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { DeadlineView } from '@/components/views/deadline-view';
import { FEATURE_SCOUT } from '@/lib/feature-flags';

const TITLE = 'Deadline Day';
const DESCRIPTION =
  'Countdown to the FPL deadline with your unresolved squad issues in one place — flagged players, predicted price moves, and what to fix before squads lock.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/deadline' },
  openGraph: { url: '/deadline', type: 'website', title: TITLE, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

export default function DeadlinePage() {
  if (!FEATURE_SCOUT) redirect('/');
  return <DeadlineView />;
}
