import { useState } from 'react';

import { useRouter } from 'expo-router';

import {
  Button,
  Card,
  FNote,
  FilterButton,
  PageHeader,
  SectionHeader,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';

import { Screen } from '@/components/screen';
import { TrackedLeagueCard } from '@/components/tracked-league-card';
import { useSavedEntryId } from '@/lib/saved-team';
import { useEntry } from '@/queries/fpl';

const MAX_CLASSIC_LEAGUES = 5;

export function LeaguesView() {
  const { entryId, hydrated } = useSavedEntryId();

  if (!hydrated) {
    return <Screen />;
  }

  if (entryId === null) {
    return (
      <Screen topInset>
        <PageHeader
          tone="stadium"
          title="My Leagues"
          meta="Enter your FPL team ID to see your leagues"
        />
        <Card paddingHorizontal={20} paddingVertical={20}>
          <SectionHeader title="Link your FPL team" />
          <Text fontFamily="$body" fontSize={13} color="$colorMuted" marginTop={4}>
            Enter your FPL team ID on the Home tab to see your live mini-league standings.
          </Text>
        </Card>
        <FNote>SimplyFPL is not affiliated with the Premier League or Fantasy Premier League</FNote>
      </Screen>
    );
  }

  return <EntryLeagues entryId={entryId} />;
}

interface EntryLeaguesProps {
  entryId: number;
}

function EntryLeagues({ entryId }: EntryLeaguesProps) {
  const { data: entry, isLoading, isError } = useEntry(entryId);
  const router = useRouter();
  const [activeLeagueId, setActiveLeagueId] = useState<number | null>(null);

  const classicLeagues = (entry?.leagues?.classic ?? [])
    .filter((l) => l.league_type !== 's')
    .slice(0, MAX_CLASSIC_LEAGUES);

  const activeId = activeLeagueId ?? classicLeagues[0]?.id ?? null;

  return (
    <Screen topInset>
      <PageHeader
        tone="stadium"
        title="My Leagues"
        meta={
          entry ? `Team ${entryId} · ${entry.name}` : `Team ${entryId} · Live mini-league standings`
        }
      />

      {isLoading ? (
        <Card paddingHorizontal={16} paddingVertical={13}>
          <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
            Loading your leagues…
          </Text>
        </Card>
      ) : null}

      {isError ? (
        <Card paddingHorizontal={16} paddingVertical={13}>
          <Text fontFamily="$body" fontSize={13} color="$danger">
            Couldn't load this team. Check the team ID and try again.
          </Text>
        </Card>
      ) : null}

      {!isLoading && !isError && classicLeagues.length === 0 ? (
        <Card paddingHorizontal={16} paddingVertical={13}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            No mini-leagues found for this team yet.
          </Text>
        </Card>
      ) : null}

      {classicLeagues.length > 0 ? (
        <YStack gap={14}>
          <XStack gap={8} flexWrap="wrap">
            {classicLeagues.map((league) => (
              <FilterButton
                key={league.id}
                active={league.id === activeId}
                onPress={() => setActiveLeagueId(league.id)}
              >
                {league.name}
              </FilterButton>
            ))}
          </XStack>

          {activeId !== null ? (
            <YStack gap={12}>
              <XStack justifyContent="flex-end">
                <Button tone="ghost" size="sm" onPress={() => router.push(`/rivals/${activeId}`)}>
                  View rivals →
                </Button>
              </XStack>
              <TrackedLeagueCard key={activeId} leagueId={activeId} myEntryId={entryId} />
            </YStack>
          ) : null}
        </YStack>
      ) : null}

      <FNote>Tap a rival to see your head-to-head. Standings refresh live every 90s.</FNote>
    </Screen>
  );
}
