import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { SettingsView } from '@/components/views/settings-view';
import { FEATURE_AUTH } from '@/lib/feature-flags';

const TITLE = 'Settings';
const DESCRIPTION = 'Manage your SimplyFPL account.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/settings' },
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  if (!FEATURE_AUTH) redirect('/');
  return <SettingsView />;
}
