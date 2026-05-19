'use client';

import { LiveRankRealView } from '@/components/views/live-rank-real-view';

interface LiveRankSectionProps {
  entryId: number;
}

export function LiveRankSection({ entryId }: LiveRankSectionProps) {
  return (
    <section data-testid="home-unified-live-rank">
      <LiveRankRealView entryId={entryId} />
    </section>
  );
}
