import { LiveRankRealView } from '@/components/views/live-rank-real-view';

// Static shell + dynamic params. Pre-renders at build time, no per-request
// RSC streaming. Fixes a next-on-pages bug where edge-runtime dynamic
// pages get their RSC flight payload chunked mid-string, breaking the JS
// parser in the browser. The view reads the entryId from useParams() on
// the client.
export const runtime = 'edge';
export const dynamic = 'force-static';
export const dynamicParams = true;

export default function LiveRankPage() {
  return <LiveRankRealView />;
}

export function generateMetadata() {
  return { title: `Live Rank — SimplyFPL` };
}
