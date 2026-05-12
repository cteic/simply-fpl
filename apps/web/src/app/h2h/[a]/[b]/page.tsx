import { notFound } from 'next/navigation';

import { HeadToHeadView } from '@/components/views/head-to-head-view';

export const runtime = 'edge';

interface Props {
  params: Promise<{ a: string; b: string }>;
}

export default async function HeadToHeadPage({ params }: Props) {
  const { a, b } = await params;
  const yourEntryId = parseInt(a, 10);
  const theirEntryId = parseInt(b, 10);

  if (
    isNaN(yourEntryId) ||
    yourEntryId <= 0 ||
    isNaN(theirEntryId) ||
    theirEntryId <= 0 ||
    yourEntryId === theirEntryId
  ) {
    notFound();
  }

  return <HeadToHeadView yourEntryId={yourEntryId} theirEntryId={theirEntryId} />;
}

export function generateMetadata() {
  return { title: 'Head to Head — SimplyFPL' };
}
