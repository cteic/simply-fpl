import type { Metadata } from 'next';

import { HeadToHeadView } from '@/components/views/head-to-head-view';

const TITLE = 'Head to Head';
const DESCRIPTION =
  'Compare two FPL managers side-by-side — captain choice, differential picks, live points and projected score.';

export default function HeadToHeadPage() {
  return <HeadToHeadView />;
}

export function generateMetadata(): Metadata {
  return {
    title: TITLE,
    description: DESCRIPTION,
    openGraph: { type: 'website', title: TITLE, description: DESCRIPTION },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
  };
}
