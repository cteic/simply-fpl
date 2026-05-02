import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../auth';

export interface TrackedLeague {
  league_id: number;
  position: number;
}

interface UseTrackedLeaguesResult {
  leagues: TrackedLeague[];
  isLoading: boolean;
  error: Error | null;
  add: (leagueId: number) => Promise<{ error: Error | null }>;
  remove: (leagueId: number) => Promise<{ error: Error | null }>;
  refresh: () => Promise<void>;
}

export function useTrackedLeagues(): UseTrackedLeaguesResult {
  const { client, user } = useAuth();
  const [leagues, setLeagues] = useState<TrackedLeague[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchLeagues = useCallback(async () => {
    if (!user) {
      setLeagues([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    const { data, error: queryError } = await client
      .from('user_leagues')
      .select('league_id, position')
      .eq('user_id', user.id)
      .order('position', { ascending: true });
    if (queryError) {
      setError(new Error(queryError.message));
      setIsLoading(false);
      return;
    }
    setLeagues(data ?? []);
    setIsLoading(false);
  }, [client, user]);

  useEffect(() => {
    fetchLeagues();
  }, [fetchLeagues]);

  const add = useCallback(
    async (leagueId: number) => {
      if (!user) return { error: new Error('Not signed in') };
      const nextPosition = leagues.length;
      const { error: insertError } = await client.from('user_leagues').insert({
        user_id: user.id,
        league_id: leagueId,
        position: nextPosition,
      });
      if (insertError) return { error: new Error(insertError.message) };
      await fetchLeagues();
      return { error: null };
    },
    [client, user, leagues.length, fetchLeagues]
  );

  const remove = useCallback(
    async (leagueId: number) => {
      if (!user) return { error: new Error('Not signed in') };
      const { error: deleteError } = await client
        .from('user_leagues')
        .delete()
        .eq('user_id', user.id)
        .eq('league_id', leagueId);
      if (deleteError) return { error: new Error(deleteError.message) };
      await fetchLeagues();
      return { error: null };
    },
    [client, user, fetchLeagues]
  );

  return { leagues, isLoading, error, add, remove, refresh: fetchLeagues };
}
