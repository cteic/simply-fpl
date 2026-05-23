import { Card, FNote, SectionHeader, Text, YStack } from '@simplyfpl/ui';

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
      <Screen>
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

function EntryLeagues({ entryId }: { entryId: number }) {
  const { data: entry, isLoading, isError } = useEntry(entryId);

  const classicLeagues = (entry?.leagues?.classic ?? [])
    .filter((l) => l.league_type !== 's')
    .slice(0, MAX_CLASSIC_LEAGUES);

  return (
    <Screen>
      <YStack>
        <Text fontFamily="$body" fontSize={21} fontWeight="600" letterSpacing={-0.4} color="$color">
          My Leagues
        </Text>
        <Text fontFamily="$body" fontSize={12} color="$colorMuted" marginTop={4}>
          {entry ? `Team ${entryId} · ${entry.name}` : `Team ${entryId} · Live standings`}
        </Text>
      </YStack>

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

      {classicLeagues.map((league) => (
        <TrackedLeagueCard key={league.id} leagueId={league.id} myEntryId={entryId} />
      ))}

      <FNote>Tap a rival to see your head-to-head. Standings refresh live every 90s.</FNote>
    </Screen>
  );
}
