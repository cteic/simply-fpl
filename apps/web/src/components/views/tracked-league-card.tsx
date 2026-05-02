'use client';

import { Card, LeagueCard, Text, YStack } from '@simplyfpl/ui';
import type { LeagueTableRow } from '@simplyfpl/ui';

import { useClassicLeague } from '@/queries/fpl';

interface TrackedLeagueCardProps {
  leagueId: number;
}

export function TrackedLeagueCard({ leagueId }: TrackedLeagueCardProps) {
  const { data, isLoading, error } = useClassicLeague(leagueId);

  if (isLoading) {
    return (
      <Card paddingHorizontal={16} paddingVertical={13}>
        <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
          Loading league {leagueId}…
        </Text>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card paddingHorizontal={16} paddingVertical={13}>
        <YStack gap={4}>
          <Text fontFamily="$body" fontSize={13} color="$danger">
            Couldn't load league {leagueId}
          </Text>
          <Text fontFamily="$body" fontSize={11} color="$colorSubtle">
            {error instanceof Error ? error.message : 'Unknown error'}
          </Text>
        </YStack>
      </Card>
    );
  }

  const rows: LeagueTableRow[] = data.standings.results.slice(0, 10).map((row) => ({
    position: row.rank,
    managerName: row.player_name,
    teamName: row.entry_name,
    gwScore: row.event_total,
    totalPoints: row.total,
  }));

  return (
    <LeagueCard
      name={data.league.name}
      meta={`Classic · ${data.standings.results.length} managers`}
      rows={rows}
    />
  );
}
