'use client';

import { useState } from 'react';

import { Button, Card, LeagueCard, Text, XStack, YStack } from '@simplyfpl/ui';
import type { LeagueTableRow } from '@simplyfpl/ui';

import { useClassicLeague } from '@/queries/fpl';

interface TrackedLeagueCardProps {
  leagueId: number;
  myEntryId?: number;
}

export function TrackedLeagueCard({ leagueId, myEntryId }: TrackedLeagueCardProps) {
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

  if (data.standings.results.length === 0) {
    return (
      <Card paddingHorizontal={16} paddingVertical={13}>
        <YStack gap={4}>
          <Text fontFamily="$body" fontSize={13} fontWeight="600" color="$color">
            {data.league.name}
          </Text>
          <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
            No managers in this league yet.
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
    <YStack gap={6}>
      <LeagueCard
        name={data.league.name}
        meta={`Classic · ${totalRows} managers`}
        rows={rows}
        {...(onRowClick !== undefined ? { onRowClick } : {})}
      />
      <XStack gap={8}>
        <Button
          tone="primary"
          size="sm"
          onPress={() => {
            window.location.href = `/rivals/${leagueId}`;
          }}
        >
          Rivals
        </Button>
        {totalRows > 10 ? (
          <Button tone="ghost" size="sm" onPress={() => setExpanded((v: boolean) => !v)}>
            {expanded ? 'Show top 10' : `Show all ${totalRows}`}
          </Button>
        ) : null}
      </XStack>
    </YStack>
  );
}
