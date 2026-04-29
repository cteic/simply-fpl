import { useQuery } from '@tanstack/react-query';
import { fplClient } from '@simplyfpl/fpl-client';
import { getCurrentGameweek } from '@simplyfpl/fpl-client';

export function useBootstrap() {
  return useQuery({
    queryKey: ['bootstrap'],
    queryFn: () => fplClient.getBootstrapStatic(),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useLiveGameweek(eventId: number | null) {
  return useQuery({
    queryKey: ['live-gw', eventId],
    queryFn: () => {
      if (eventId === null) throw new Error('eventId required');
      return fplClient.getLiveGameweek(eventId);
    },
    enabled: eventId !== null,
    refetchInterval: 60_000,
  });
}

export function useEntry(entryId: number) {
  return useQuery({
    queryKey: ['entry', entryId],
    queryFn: () => fplClient.getEntry(entryId),
  });
}

export function useEntryPicks(entryId: number, eventId: number | null) {
  return useQuery({
    queryKey: ['entry-picks', entryId, eventId],
    queryFn: () => {
      if (eventId === null) throw new Error('eventId required');
      return fplClient.getEntryPicks(entryId, eventId);
    },
    enabled: eventId !== null,
    refetchInterval: 60_000,
  });
}

export function useCurrentGameweek() {
  const { data: bootstrap } = useBootstrap();
  return bootstrap ? getCurrentGameweek(bootstrap) : null;
}

export function useClassicLeague(leagueId: number) {
  return useQuery({
    queryKey: ['classic-league', leagueId],
    queryFn: () => fplClient.getClassicLeague(leagueId),
    refetchInterval: 90_000,
  });
}
