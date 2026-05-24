import type { Metadata } from 'next';

import { SettingsView } from '@/components/views/settings-view';

const TITLE = 'Settings';
const DESCRIPTION = 'Manage your SimplyFPL account.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/settings' },
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return <SettingsView />;
}
