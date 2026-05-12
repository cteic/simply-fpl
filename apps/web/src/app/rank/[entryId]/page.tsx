import { notFound } from 'next/navigation';

import { LiveRankRealView } from '@/components/views/live-rank-real-view';

export const runtime = 'edge';

interface Props {
  params: Promise<{ entryId: string }>;
}

export default async function LiveRankPage({ params }: Props) {
  const { entryId } = await params;
  const id = parseInt(entryId, 10);

  if (isNaN(id) || id <= 0) {
    notFound();
  }

  return <LiveRankRealView entryId={id} />;
}

export function generateMetadata() {
  return { title: `Live Rank — SimplyFPL` };
}
