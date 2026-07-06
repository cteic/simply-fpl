import type { Metadata } from 'next';

import { RivalsView } from '@/components/views/rivals-view';

export const runtime = 'edge';

const TITLE = 'Rivals';
const DESCRIPTION =
  'The managers right next to you in your mini-league — live points, captain calls and differential picks that move your rank.';

export default function RivalsPage() {
  return <RivalsView />;
}

export function generateMetadata(): Metadata {
  return {
    title: TITLE,
    description: DESCRIPTION,
    openGraph: { type: 'website', title: TITLE, description: DESCRIPTION },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
  };
}
