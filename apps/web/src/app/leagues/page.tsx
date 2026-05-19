import type { Metadata } from 'next';

import { LeaguesShowcase } from '@/components/views/leagues-showcase';

const TITLE = 'Mini-Leagues';
const DESCRIPTION =
  'Track live FPL mini-league standings — every gameweek score, rank movement and captain pick updated in real time.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/leagues' },
  openGraph: { url: '/leagues', type: 'website', title: TITLE, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

export default function LeaguesPage() {
  return <LeaguesShowcase />;
}
