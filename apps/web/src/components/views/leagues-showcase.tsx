'use client';

import { useState } from 'react';

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

import { TrackedLeagueCard } from './tracked-league-card';

const { useAuth } = auth;
const { useTrackedLeagues } = leaguesFeatures;

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

  if (isAuthLoading) {
    return (
      <PageShell>
        <PageHeader title="My Leagues" meta="Loading…" />
      </PageShell>
    );
  }

  if (!session) {
    return <UnauthedView />;
  }

  return <AuthedView />;
}

function UnauthedView() {
  return (
    <PageShell>
      <PageHeader title="My Leagues" meta="Sign in to track your FPL mini-leagues" />

      <Card paddingHorizontal={24} paddingVertical={24} marginBottom={20}>
        <SectionHeader title="Sign in to track leagues" />
        <YStack gap={10} marginTop={4}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            Add any FPL mini-league by ID or URL and we'll keep its standings live for you. A magic
            link to your email is all it takes — no password.
          </Text>
          <XStack gap={10}>
            <Button
              tone="primary"
              size="md"
              onPress={() => {
                window.location.href = '/login';
              }}
            >
              Sign in with email
            </Button>
            <Button
              tone="ghost"
              size="md"
              onPress={() => {
                window.location.href = '/demo/leagues';
              }}
            >
              See a demo
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
        <LeagueListBody
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
  leagues: { league_id: number }[];
  onRemove: (leagueId: number) => void;
}

function LeagueListBody({ isLoading, leagues, onRemove }: LeagueListBodyProps) {
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
