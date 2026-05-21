'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

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

const { useAuth } = auth;

export function SettingsView() {
  const router = useRouter();
  const { session, user, isPro, isLoading, signOut } = useAuth();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/login');
    }
  }, [isLoading, session, router]);

  if (isLoading || !session) {
    return (
      <PageShell>
        <PageHeader title="Settings" meta="Loading…" />
      </PageShell>
    );
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/');
  }

  return (
    <PageShell>
      <PageHeader tone="stadium" title="Settings" meta={user?.email ?? ''} />

      <Card paddingHorizontal={24} paddingVertical={20} marginBottom={20}>
        <SectionHeader title="Account" />
        <YStack gap={10} marginTop={8}>
          <Row label="Email" value={user?.email ?? '—'} />
          <Row label="Plan" value={isPro ? 'Pro' : 'Free'} />
        </YStack>
      </Card>

      <Card paddingHorizontal={24} paddingVertical={20} marginBottom={20}>
        <SectionHeader title="Session" />
        <YStack gap={10} marginTop={8}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            Signing out will end your session on this device. Your tracked leagues stay saved.
          </Text>
          <XStack>
            <Button
              tone="ghost"
              size="md"
              onPress={() => {
                handleSignOut();
              }}
            >
              Sign out
            </Button>
          </XStack>
        </YStack>
      </Card>

      <FNote>More account controls coming once subscriptions launch.</FNote>
    </PageShell>
  );
}

interface RowProps {
  label: string;
  value: string;
}

function Row({ label, value }: RowProps) {
  return (
    <XStack justifyContent="space-between" alignItems="center">
      <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
        {label}
      </Text>
      <Text fontFamily="$body" fontSize={13} color="$color">
        {value}
      </Text>
    </XStack>
  );
}
