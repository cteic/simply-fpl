'use client';

import { useEffect, useState } from 'react';

import { auth, leagues as leaguesFeatures } from '@simplyfpl/features';
import {
  Button,
  Card,
  FNote,
  Input,
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
const { useTrackedLeagues } = leaguesFeatures;

const STORAGE_KEY = 'simplyfpl:lastEntryId';
const MAX_CLASSIC_LEAGUES = 5;

function parseLeagueId(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const direct = Number(trimmed);
  if (Number.isInteger(direct) && direct > 0) return direct;
  const fromUrl = trimmed.match(/leagues\/(\d+)/i)?.[1];
  if (fromUrl) {
    const parsed = Number(fromUrl);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

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

  if (session) {
    return <AuthedView />;
  }

  if (entryId !== null) {
    return <PublicEntryLeaguesView entryId={entryId} />;
  }

  return <NoTeamView />;
}

function PublicEntryLeaguesView({ entryId }: { entryId: number }) {
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

      <Card paddingHorizontal={20} paddingVertical={16} marginBottom={20}>
        <Text fontFamily="$body" fontSize={13} color="$colorMuted">
          Sign in to pin extra leagues and keep them across devices.
        </Text>
        <XStack marginTop={10}>
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

      <LeagueListBody
        isLoading={isLoading}
        isError={isError}
        leagueIds={classicLeagues.map((l) => l.id)}
        emptyMessage="No mini-leagues found for this team yet."
      />

      <FNote>SimplyFPL is not affiliated with the Premier League or Fantasy Premier League</FNote>
    </PageShell>
  );
}

function NoTeamView() {
  return (
    <PageShell>
      <PageHeader title="My Leagues" meta="Enter your FPL team ID to see your leagues" />

      <Card paddingHorizontal={24} paddingVertical={24} marginBottom={20}>
        <SectionHeader title="Link your FPL team" />
        <YStack gap={10} marginTop={4}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            We pull your live mini-league standings straight from FPL once we know your team ID.
            Sign in afterwards if you want to pin extra leagues across devices.
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
            <Button
              tone="ghost"
              size="md"
              onPress={() => {
                window.location.href = '/login';
              }}
            >
              Sign in
            </Button>
          </XStack>
        </YStack>
      </Card>

      <FNote>SimplyFPL is not affiliated with the Premier League or Fantasy Premier League</FNote>
    </PageShell>
  );
}

function AuthedView() {
  const { signOut, user } = useAuth();
  const { leagues, add, remove, isLoading, error } = useTrackedLeagues();
  const [input, setInput] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  async function handleAdd() {
    setAddError(null);
    const leagueId = parseLeagueId(input);
    if (!leagueId) {
      setAddError('Enter a numeric FPL league ID or paste an FPL league URL.');
      return;
    }
    setIsAdding(true);
    const { error: addErr } = await add(leagueId);
    setIsAdding(false);
    if (addErr) {
      setAddError(addErr.message);
      return;
    }
    setInput('');
  }

  return (
    <PageShell>
      <PageHeader title="My Leagues" meta={user?.email ?? 'Live standings'} />

      <Card paddingHorizontal={24} paddingVertical={24} marginBottom={20}>
        <SectionHeader title="Add a league" />
        <YStack gap={10} marginTop={4}>
          <XStack gap={10}>
            <Input
              flex={1}
              value={input}
              onChangeText={setInput}
              placeholder="Enter league ID or paste FPL league URL…"
              borderColor="$borderStrong"
              backgroundColor="$background"
            />
            <Button
              tone="primary"
              size="md"
              onPress={() => {
                handleAdd();
              }}
            >
              {isAdding ? 'Adding…' : 'Track League'}
            </Button>
          </XStack>
          {addError ? (
            <Text fontFamily="$body" fontSize={12} color="$danger">
              {addError}
            </Text>
          ) : null}
        </YStack>
      </Card>

      {error ? (
        <Card paddingHorizontal={16} paddingVertical={13} marginBottom={20}>
          <Text fontFamily="$body" fontSize={13} color="$danger">
            {error.message}
          </Text>
        </Card>
      ) : null}

      <YStack gap={10}>
        <TrackedLeagueListBody
          isLoading={isLoading}
          leagues={leagues}
          onRemove={(leagueId) => {
            remove(leagueId);
          }}
        />
      </YStack>

      <XStack marginTop={20}>
        <Button
          tone="ghost"
          size="sm"
          onPress={() => {
            signOut();
          }}
        >
          Sign out
        </Button>
      </XStack>

      <FNote>SimplyFPL is not affiliated with the Premier League or Fantasy Premier League</FNote>
    </PageShell>
  );
}

interface LeagueListBodyProps {
  isLoading: boolean;
  isError?: boolean;
  leagueIds: number[];
  emptyMessage: string;
}

function LeagueListBody({ isLoading, isError, leagueIds, emptyMessage }: LeagueListBodyProps) {
  if (isLoading) {
    return (
      <Card paddingHorizontal={16} paddingVertical={13}>
        <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
          Loading your leagues…
        </Text>
      </Card>
    );
  }

  if (isError === true) {
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
        <TrackedLeagueCard key={leagueId} leagueId={leagueId} />
      ))}
    </YStack>
  );
}

interface TrackedLeagueListBodyProps {
  isLoading: boolean;
  leagues: { league_id: number }[];
  onRemove: (leagueId: number) => void;
}

function TrackedLeagueListBody({ isLoading, leagues, onRemove }: TrackedLeagueListBodyProps) {
  if (isLoading && leagues.length === 0) {
    return (
      <Card paddingHorizontal={16} paddingVertical={13}>
        <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
          Loading your leagues…
        </Text>
      </Card>
    );
  }

  if (leagues.length === 0) {
    return (
      <Card paddingHorizontal={16} paddingVertical={13}>
        <Text fontFamily="$body" fontSize={13} color="$colorMuted">
          No leagues tracked yet. Add one above to get started.
        </Text>
      </Card>
    );
  }

  return (
    <>
      {leagues.map((league) => (
        <YStack key={league.league_id} gap={6}>
          <TrackedLeagueCard leagueId={league.league_id} />
          <XStack justifyContent="flex-end">
            <Button
              tone="ghost"
              size="sm"
              onPress={() => {
                onRemove(league.league_id);
              }}
            >
              Remove
            </Button>
          </XStack>
        </YStack>
      ))}
    </>
  );
}
