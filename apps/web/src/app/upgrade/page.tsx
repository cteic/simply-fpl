import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { UpgradeView } from '@/components/views/upgrade-view';
import { FEATURE_AUTH } from '@/lib/feature-flags';

const TITLE = 'Upgrade';
const DESCRIPTION = 'Choose a SimplyFPL plan.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/upgrade' },
  robots: { index: false, follow: false },
};

export default function UpgradePage() {
  if (!FEATURE_AUTH) redirect('/');
  return <UpgradeView />;
}
