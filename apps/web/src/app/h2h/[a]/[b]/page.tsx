import type { Metadata } from 'next';

import { HeadToHeadView } from '@/components/views/head-to-head-view';

// Static shell + dynamic params. Pre-renders at build time, no per-request
// RSC streaming. Fixes a next-on-pages bug where edge-runtime dynamic
// pages get their RSC flight payload chunked mid-string, breaking the JS
// parser in the browser. The view reads {a, b} from useParams() on the
// client.
export const runtime = 'edge';
export const dynamic = 'force-static';
export const dynamicParams = true;

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
