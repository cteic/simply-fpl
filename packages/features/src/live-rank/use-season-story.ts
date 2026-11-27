import { useQuery } from '@tanstack/react-query';

import { buildSeasonStory, fplClient } from '@simplyfpl/fpl-client';
import type { SeasonStory } from '@simplyfpl/types';

export interface UseSeasonStoryResult {
  /** Null while loading or when the history could not be fetched. */
  story: SeasonStory | null;
}

/**
 * The manager's settled season so far: rank after every gameweek, arrows,
 * streak and records. History only changes when a gameweek settles, so it is
 * fetched rarely.
 */
export function useSeasonStory(entryId: number | null): UseSeasonStoryResult {
  const query = useQuery({
    queryKey: ['entry-history', entryId],
    queryFn: () => {
      if (entryId === null) throw new Error('entryId required');
      return fplClient.getEntryHistory(entryId);
    },
    enabled: entryId !== null,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  const story = query.data ? buildSeasonStory(query.data) : null;
  return { story };
}
