import { redirect } from 'next/navigation';

import { SettingsView } from '@/components/views/settings-view';
import { FEATURE_AUTH } from '@/lib/feature-flags';

export default function SettingsPage() {
  if (!FEATURE_AUTH) redirect('/');
  return <SettingsView />;
}

export const metadata = {
  title: 'Settings — SimplyFPL',
  description: 'Manage your SimplyFPL account.',
};
