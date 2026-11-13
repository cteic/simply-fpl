import type { Metadata } from 'next';

import { SupportView } from '@/components/views/support-view';

const TITLE = 'Support';
const DESCRIPTION =
  'Get help with SimplyFPL: contact details and answers about live rank, mini-leagues, subscriptions and account deletion.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/support' },
};

export default function SupportPage() {
  return <SupportView />;
}
