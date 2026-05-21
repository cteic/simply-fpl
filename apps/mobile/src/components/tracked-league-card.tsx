import { useState } from 'react';

import { useRouter } from 'expo-router';

import { Button, Card, LeagueCard, Text, XStack, YStack } from '@simplyfpl/ui';
import type { LeagueTableRow } from '@simplyfpl/ui';

import { useClassicLeague } from '@/queries/fpl';

interface TrackedLeagueCardProps {
  leagueId: number;
  myEntryId: number;
}

export function TrackedLeagueCard({ leagueId, myEntryId }: TrackedLeagueCardProps) {
  const { data, isLoading, error } = useClassicLeague(leagueId);
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

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
        <Text fontFamily="$body" fontSize={13} color="$danger">
          Couldn't load league {leagueId}
        </Text>
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
    isYou: row.entry === myEntryId,
    gwScore: row.event_total,
    totalPoints: row.total,
  }));

  function onRowClick(theirEntryId: number) {
    router.push({ pathname: '/h2h', params: { you: myEntryId, them: theirEntryId } });
  }

  return (
    <YStack gap={6}>
      <LeagueCard
        name={data.league.name}
        meta={`Classic · ${totalRows} managers`}
        rows={rows}
        onRowClick={onRowClick}
      />
      {totalRows > 10 ? (
        <XStack>
          <Button tone="ghost" size="sm" onPress={() => setExpanded((v) => !v)}>
            {expanded ? 'Show top 10' : `Show all ${totalRows}`}
          </Button>
        </XStack>
      ) : null}
    </YStack>
  );
}
