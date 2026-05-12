'use client';

import { Card, LeagueCard, Text, YStack } from '@simplyfpl/ui';
import type { LeagueTableRow } from '@simplyfpl/ui';

import { useClassicLeague } from '@/queries/fpl';

interface TrackedLeagueCardProps {
  leagueId: number;
  myEntryId?: number;
}

export function TrackedLeagueCard({ leagueId, myEntryId }: TrackedLeagueCardProps) {
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
    entryId: row.entry,
    isYou: myEntryId !== undefined && row.entry === myEntryId,
    gwScore: row.event_total,
    totalPoints: row.total,
  }));

  const onRowClick =
    myEntryId !== undefined
      ? (theirEntryId: number) => {
          window.location.href = `/h2h/${myEntryId}/${theirEntryId}`;
        }
      : undefined;

  return (
    <LeagueCard
      name={data.league.name}
      meta={`Classic · ${data.standings.results.length} managers`}
      rows={rows}
      {...(onRowClick !== undefined ? { onRowClick } : {})}
    />
  );
}
