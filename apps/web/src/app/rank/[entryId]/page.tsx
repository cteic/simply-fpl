import { LiveRankView } from '@/components/live-rank-view';

interface Props {
  params: Promise<{ entryId: string }>;
}

export default async function LiveRankPage({ params }: Props) {
  const { entryId } = await params;
  const id = parseInt(entryId, 10);

  if (isNaN(id)) {
    return <div>Invalid team ID</div>;
  }

  return <LiveRankView entryId={id} />;
}

export function generateMetadata() {
  return { title: `Live Rank — SimplyFPL` };
}
