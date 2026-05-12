'use client';

import { useEffect, useState } from 'react';

import { auth } from '@simplyfpl/features';
import {
  Button,
  Card,
  FNote,
  PageHeader,
  PageShell,
  SectionHeader,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';

import { useEntry } from '@/queries/fpl';

import { TrackedLeagueCard } from './tracked-league-card';

const { useAuth } = auth;

const STORAGE_KEY = 'simplyfpl:lastEntryId';
const MAX_CLASSIC_LEAGUES = 5;

export function LeaguesShowcase() {
  const { session, isLoading: isAuthLoading } = useAuth();
  const [entryId, setEntryId] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const id = saved ? Number(saved) : NaN;
    if (Number.isInteger(id) && id > 0) {
      setEntryId(id);
    }
    setHydrated(true);
  }, []);

  if (isAuthLoading || !hydrated) {
    return (
      <PageShell>
        <PageHeader title="My Leagues" meta="Loading…" />
      </PageShell>
    );
  }

  if (entryId === null) {
    return <NoTeamView signedIn={session !== null} />;
  }

  return <EntryLeaguesView entryId={entryId} signedIn={session !== null} />;
}

function EntryLeaguesView({ entryId, signedIn }: { entryId: number; signedIn: boolean }) {
  const { data: entry, isLoading, isError } = useEntry(entryId);

  const classicLeagues = (entry?.leagues?.classic ?? [])
    .filter((l) => l.league_type !== 's')
    .slice(0, MAX_CLASSIC_LEAGUES);

  return (
    <PageShell>
      <PageHeader
        title="My Leagues"
        meta={
          entry ? `Team ${entryId} · ${entry.name}` : `Team ${entryId} · Live mini-league standings`
        }
      />

      <LeagueListBody
        isLoading={isLoading}
        isError={isError}
        leagueIds={classicLeagues.map((l) => l.id)}
        myEntryId={entryId}
        emptyMessage="No mini-leagues found for this team yet."
      />

      {!signedIn ? (
        <Card paddingHorizontal={20} paddingVertical={16} marginTop={20}>
          <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
            Sign in to keep your team ID across devices.
          </Text>
          <XStack marginTop={8}>
            <Button
              tone="ghost"
              size="sm"
              onPress={() => {
                window.location.href = '/login';
              }}
            >
              Sign in
            </Button>
          </XStack>
        </Card>
      ) : null}

      <FNote>SimplyFPL is not affiliated with the Premier League or Fantasy Premier League</FNote>
    </PageShell>
  );
}

function NoTeamView({ signedIn }: { signedIn: boolean }) {
  return (
    <PageShell>
      <PageHeader title="My Leagues" meta="Enter your FPL team ID to see your leagues" />

      <Card paddingHorizontal={24} paddingVertical={24} marginBottom={20}>
        <SectionHeader title="Link your FPL team" />
        <YStack gap={10} marginTop={4}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            We pull your live mini-league standings straight from FPL once we know your team ID.
          </Text>
          <XStack gap={10}>
            <Button
              tone="primary"
              size="md"
              onPress={() => {
                window.location.href = '/';
              }}
            >
              Enter team ID
            </Button>
            {signedIn ? null : (
              <Button
                tone="ghost"
                size="md"
                onPress={() => {
                  window.location.href = '/login';
                }}
              >
                Sign in
              </Button>
            )}
          </XStack>
        </YStack>
      </Card>

      <FNote>SimplyFPL is not affiliated with the Premier League or Fantasy Premier League</FNote>
    </PageShell>
  );
}

interface LeagueListBodyProps {
  isLoading: boolean;
  isError: boolean;
  leagueIds: number[];
  myEntryId?: number;
  emptyMessage: string;
}

function LeagueListBody({
  isLoading,
  isError,
  leagueIds,
  myEntryId,
  emptyMessage,
}: LeagueListBodyProps) {
  if (isLoading) {
    return (
      <Card paddingHorizontal={16} paddingVertical={13}>
        <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
          Loading your leagues…
        </Text>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card paddingHorizontal={16} paddingVertical={13}>
        <Text fontFamily="$body" fontSize={13} color="$danger">
          Couldn't load this team. Check the team ID and try again.
        </Text>
      </Card>
    );
  }

  if (leagueIds.length === 0) {
    return (
      <Card paddingHorizontal={16} paddingVertical={13}>
        <Text fontFamily="$body" fontSize={13} color="$colorMuted">
          {emptyMessage}
        </Text>
      </Card>
    );
  }

  return (
    <YStack gap={10}>
      {leagueIds.map((leagueId) => (
        <TrackedLeagueCard
          key={leagueId}
          leagueId={leagueId}
          {...(myEntryId !== undefined ? { myEntryId } : {})}
        />
      ))}
    </YStack>
  );
}
