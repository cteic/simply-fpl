import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { PressView } from '@/components/views/press-view';
import { FEATURE_SCOUT } from '@/lib/feature-flags';

export const runtime = 'edge';

const TITLE = 'League Press';
const DESCRIPTION =
  'Your mini-league, written up like the back pages — weekly headlines, rivalry watch and awards, ready to share with the group chat.';

export default function PressPage() {
  if (!FEATURE_SCOUT) redirect('/');
  return <PressView />;
}

export function generateMetadata(): Metadata {
  return {
    title: TITLE,
    description: DESCRIPTION,
    robots: { index: false, follow: false },
    openGraph: { type: 'website', title: TITLE, description: DESCRIPTION },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
  };
}
