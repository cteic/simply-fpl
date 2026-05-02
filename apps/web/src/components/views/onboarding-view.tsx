'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { auth } from '@simplyfpl/features';
import { fplClient } from '@simplyfpl/fpl-client';
import type { FplEntry } from '@simplyfpl/types';
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

export function OnboardingView() {
  const router = useRouter();
  const { session, profile, isLoading, isProfileLoading, updateProfile } = useAuth();

  const [input, setInput] = useState('');
  const [lookup, setLookup] = useState<{ id: number; entry: FplEntry } | null>(null);
  const [status, setStatus] = useState<'idle' | 'looking-up' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!isProfileLoading && profile?.fplEntryId) {
      router.replace('/');
    }
  }, [isLoading, isProfileLoading, session, profile?.fplEntryId, router]);

  async function handleLookup() {
    setError(null);
    const id = parseEntryId(input);
    if (!id) {
      setError('Enter a numeric FPL team ID or paste your FPL team URL.');
      return;
    }
    setStatus('looking-up');
    try {
      const entry = await fplClient.getEntry(id);
      setLookup({ id, entry });
      setStatus('idle');
    } catch (err) {
      setStatus('idle');
      setError(
        err instanceof Error
          ? `Couldn't find team ${id}: ${err.message}`
          : `Couldn't find team ${id}`
      );
    }
  }

  async function handleConfirm() {
    if (!lookup) return;
    setStatus('saving');
    setError(null);
    const { error: saveError } = await updateProfile({ fplEntryId: lookup.id });
    if (saveError) {
      setStatus('idle');
      setError(saveError.message);
      return;
    }
    router.replace('/');
  }

  function handleReset() {
    setLookup(null);
    setError(null);
  }

  if (isLoading || !session) {
    return (
      <PageShell>
        <PageHeader title="Welcome to SimplyFPL" meta="Loading…" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Welcome to SimplyFPL"
        meta={`Signed in as ${session.user.email ?? 'your account'}`}
      />

      <Card paddingHorizontal={24} paddingVertical={24} marginBottom={20}>
        <SectionHeader title="Link your FPL team" />
        <YStack gap={10} marginTop={4}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            Enter your FPL team ID (or paste your team URL) so we can pull your live rank, picks,
            and history. You can change this anytime.
          </Text>

          {lookup === null ? (
            <>
              <XStack gap={10}>
                <Input
                  flex={1}
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={handleLookup}
                  placeholder="e.g. 1234567 or fantasy.premierleague.com/entry/1234567/event/30"
                  borderColor="$borderStrong"
                  backgroundColor="$background"
                />
                <Button tone="primary" size="md" onPress={handleLookup}>
                  {status === 'looking-up' ? 'Looking…' : 'Find team'}
                </Button>
              </XStack>
              {error ? (
                <Text fontFamily="$body" fontSize={12} color="$danger">
                  {error}
                </Text>
              ) : null}
            </>
          ) : (
            <Card paddingHorizontal={16} paddingVertical={14} backgroundColor="$background">
              <YStack gap={8}>
                <YStack>
                  <Text fontFamily="$body" fontSize={11} color="$colorSubtle">
                    Team #{lookup.id}
                  </Text>
                  <Text fontFamily="$body" fontSize={15} fontWeight="600" color="$color">
                    {lookup.entry.name}
                  </Text>
                  <Text fontFamily="$body" fontSize={12} color="$colorMuted">
                    {`${lookup.entry.player_first_name} ${lookup.entry.player_last_name}`.trim()}
                  </Text>
                </YStack>
                {error ? (
                  <Text fontFamily="$body" fontSize={12} color="$danger">
                    {error}
                  </Text>
                ) : null}
                <XStack gap={10}>
                  <Button tone="primary" size="md" onPress={handleConfirm}>
                    {status === 'saving' ? 'Saving…' : "That's me"}
                  </Button>
                  <Button tone="ghost" size="md" onPress={handleReset}>
                    Try another
                  </Button>
                </XStack>
              </YStack>
            </Card>
          )}
        </YStack>
      </Card>

      <FNote>
        Don't know your FPL team ID? Open your team on fantasy.premierleague.com — it's the number
        in the URL after /entry/.
      </FNote>
    </PageShell>
  );
}
