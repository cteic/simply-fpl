'use client';

import { TeamNewsCard, TeamNewsCardSkeleton } from '@simplyfpl/ui';

import { useEntryNews } from '@/queries/news';

interface NewsSectionProps {
  entryId: number;
}

export function NewsSection({ entryId }: NewsSectionProps) {
  const { data, isLoading } = useEntryNews(entryId);

  if (isLoading) return <TeamNewsCardSkeleton />;

  return <TeamNewsCard players={data?.players ?? []} />;
}
