import { HeadToHeadView } from '@/components/views/head-to-head-view';

// Static shell + dynamic params. Pre-renders at build time, no per-request
// RSC streaming. Fixes a next-on-pages bug where edge-runtime dynamic
// pages get their RSC flight payload chunked mid-string, breaking the JS
// parser in the browser. The view reads {a, b} from useParams() on the
// client.
export const dynamic = 'force-static';
export const dynamicParams = true;

export default function HeadToHeadPage() {
  return <HeadToHeadView />;
}

export function generateMetadata() {
  return { title: 'Head to Head — SimplyFPL' };
}
