'use client';

import { useState } from 'react';

import { Button, Card, LeagueCard, Text, YStack } from '@simplyfpl/ui';
import type { LeagueTableRow } from '@simplyfpl/ui';

import { useClassicLeague } from '@/queries/fpl';

interface TrackedLeagueCardProps {
  leagueId: number;
}

export function TrackedLeagueCard({ leagueId }: TrackedLeagueCardProps) {
  const { data, isLoading, error } = useClassicLeague(leagueId);
  const [expanded, setExpanded] = useState(false);

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

  const totalRows = data.standings.results.length;
  const visible =
    expanded || totalRows <= 10 ? data.standings.results : data.standings.results.slice(0, 10);

  const rows: LeagueTableRow[] = visible.map((row) => ({
    position: row.rank,
    managerName: row.player_name,
    teamName: row.entry_name,
    gwScore: row.event_total,
    totalPoints: row.total,
  }));

  return (
    <YStack gap={6}>
      <LeagueCard name={data.league.name} meta={`Classic · ${totalRows} managers`} rows={rows} />
      {totalRows > 10 ? (
        <Button tone="ghost" size="sm" onPress={() => setExpanded((v: boolean) => !v)}>
          {expanded ? 'Show top 10' : `Show all ${totalRows}`}
        </Button>
      ) : null}
    </YStack>
  );
}
