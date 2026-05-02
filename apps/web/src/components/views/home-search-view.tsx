'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { auth } from '@simplyfpl/features';
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

const LAST_ENTRY_KEY = 'simplyfpl:last-entry-id';

const { useAuth } = auth;

function parseEntryId(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const direct = Number(trimmed);
  if (Number.isInteger(direct) && direct > 0) return direct;
  const fromUrl = trimmed.match(/entry\/(\d+)/i)?.[1];
  if (fromUrl) {
    const parsed = Number(fromUrl);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

export function HomeSearchView() {
  const router = useRouter();
  const { session, profile, isLoading, isProfileLoading } = useAuth();

  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [storedEntryId, setStoredEntryId] = useState<number | null>(null);

  useEffect(() => {
    if (session) return;
    const stored = window.localStorage.getItem(LAST_ENTRY_KEY);
    if (!stored) return;
    const parsed = Number(stored);
    if (Number.isInteger(parsed) && parsed > 0) {
      setStoredEntryId(parsed);
      setInput(String(parsed));
    }
  }, [session]);

  const profileEntryId = session ? (profile?.fplEntryId ?? null) : null;
  const knownEntryId = profileEntryId ?? storedEntryId;
  let knownSource: 'profile' | 'local' | null = null;
  if (profileEntryId) knownSource = 'profile';
  else if (storedEntryId) knownSource = 'local';

  function handleSubmit() {
    setError(null);
    const id = parseEntryId(input);
    if (!id) {
      setError('Enter a numeric FPL team ID or paste an FPL team URL.');
      return;
    }
    if (!session) {
      window.localStorage.setItem(LAST_ENTRY_KEY, String(id));
    }
    router.push(`/rank/${id}`);
  }

  function handleQuickResume() {
    if (knownEntryId === null) return;
    router.push(`/rank/${knownEntryId}`);
  }

  const showLoadingResume = session && isProfileLoading && !profileEntryId;

  return (
    <PageShell>
      <PageHeader title="SimplyFPL" meta={session?.user.email ?? 'Live FPL companion · GW30'} />

      {showLoadingResume ? (
        <Card paddingHorizontal={20} paddingVertical={14} marginBottom={20}>
          <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
            Loading your linked team…
          </Text>
        </Card>
      ) : null}

      {!showLoadingResume && knownEntryId !== null ? (
        <Card paddingHorizontal={20} paddingVertical={14} marginBottom={20}>
          <XStack alignItems="center" justifyContent="space-between" gap={12} flexWrap="wrap">
            <YStack flex={1} minWidth={0}>
              <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
                {knownSource === 'profile' ? 'Your team' : 'Last team'}
              </Text>
              <Text fontFamily="$mono" fontSize={14} color="$color">
                {knownEntryId}
              </Text>
            </YStack>
            <Button tone="primary" size="sm" onPress={handleQuickResume}>
              View Live Rank
            </Button>
          </XStack>
        </Card>
      ) : null}

      <Card paddingHorizontal={24} paddingVertical={24} marginBottom={20}>
        <SectionHeader title={knownEntryId !== null ? 'Switch team' : 'Find your team'} />
        <YStack gap={10} marginTop={4}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            {session
              ? 'Look up any FPL team — yours is saved separately and follows you across devices.'
              : 'Enter your FPL team ID or paste your team URL to see your live rank, gameweek points, and pitch.'}
          </Text>
          <XStack gap={10} alignItems="center">
            <Input
              flex={1}
              size="$4"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSubmit}
              placeholder="1234567 or paste FPL team URL"
              borderColor="$borderStrong"
              backgroundColor="$background"
            />
            <Button tone="primary" size="md" onPress={handleSubmit}>
              View Live Rank
            </Button>
          </XStack>
          {error ? (
            <Text fontFamily="$body" fontSize={12} color="$danger">
              {error}
            </Text>
          ) : null}
        </YStack>
      </Card>

      {!session && !isLoading ? (
        <Card paddingHorizontal={24} paddingVertical={20} marginBottom={20}>
          <SectionHeader title="Save your team" />
          <YStack gap={6} marginTop={6}>
            <Text fontFamily="$body" fontSize={13} color="$colorMuted">
              Sign in to link your FPL team across devices, track mini-leagues, and unlock the
              transfer planner with Pro.
            </Text>
            <XStack marginTop={4}>
              <Button
                tone="ghost"
                size="sm"
                onPress={() => {
                  window.location.href = '/login';
                }}
              >
                Sign in with email
              </Button>
            </XStack>
          </YStack>
        </Card>
      ) : null}

      <Card paddingHorizontal={24} paddingVertical={20} marginBottom={20}>
        <SectionHeader title="What you get" />
        <YStack gap={6} marginTop={8}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            • Live rank that updates every 60 seconds during gameweeks
          </Text>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            • Mini-league standings with live captain and bench points
          </Text>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            • Daily price-change predictions
          </Text>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            • Fixture-difficulty planner (Pro)
          </Text>
        </YStack>
      </Card>

      <FNote>SimplyFPL is not affiliated with the Premier League or Fantasy Premier League</FNote>
    </PageShell>
  );
}
