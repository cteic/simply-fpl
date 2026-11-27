import { useState } from 'react';

import { useRouter } from 'expo-router';

import { describeLeaguePosition, getGameweekPhase } from '@simplyfpl/fpl-client';
import type { LeaguePosition } from '@simplyfpl/types';
import { Button, Card, LeagueCard, Text, XStack, YStack } from '@simplyfpl/ui';
import type { LeagueTableRow } from '@simplyfpl/ui';

import { useBootstrap, useClassicLeague } from '@/queries/fpl';

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  const unit = n % 10;
  if (unit === 1) return `${n}st`;
  if (unit === 2) return `${n}nd`;
  if (unit === 3) return `${n}rd`;
  return `${n}th`;
}

/** Where the manager stands, in the terms they would use about a rival. */
function summariseLeaguePosition(position: LeaguePosition): string {
  const parts = [
    position.managers === null
      ? ordinal(position.rank)
      : `${ordinal(position.rank)} of ${position.managers}`,
  ];
  if (position.above) {
    parts.push(
      position.above.gap === 0
        ? `level with ${position.above.name}`
        : `${position.above.gap} behind ${position.above.name}`
    );
  }
  if (position.below) parts.push(`${position.below.gap} clear of ${position.below.name}`);
  if (position.gameweekPlace !== null) {
    parts.push(`${ordinal(position.gameweekPlace)} best this GW`);
  }
  return parts.join(' \u00b7 ');
}

interface TrackedLeagueCardProps {
  leagueId: number;
  myEntryId: number;
}

export function TrackedLeagueCard({ leagueId, myEntryId }: TrackedLeagueCardProps) {
  const { data, isLoading, error } = useClassicLeague(leagueId);
  const { data: bootstrap } = useBootstrap();
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
  const position = describeLeaguePosition(data.standings.results, myEntryId, {
    complete: !data.standings.has_next,
  });
  // Keep the manager's own row on screen. Cutting at ten hid anyone eleventh
  // or lower in their own league until they tapped to expand.
  const myIndex = data.standings.results.findIndex((row) => row.entry === myEntryId);
  const collapsedCount = Math.max(10, myIndex + 1);
  const visible =
    expanded || totalRows <= collapsedCount
      ? data.standings.results
      : data.standings.results.slice(0, collapsedCount);
  const phase = bootstrap ? getGameweekPhase(bootstrap) : null;

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
        badge={phase === 'live' ? 'Live' : undefined}
        summary={position ? summariseLeaguePosition(position) : undefined}
        onRowClick={onRowClick}
      />
      {totalRows > collapsedCount ? (
        <XStack>
          <Button tone="ghost" size="sm" onPress={() => setExpanded((v) => !v)}>
            {expanded ? 'Show fewer' : `Show all ${totalRows}`}
          </Button>
        </XStack>
      ) : null}
    </YStack>
  );
}
