'use client';

import { useRouter } from 'next/navigation';

import { auth, theme as themeFeature } from '@simplyfpl/features';
import {
  Button,
  Card,
  FNote,
  PageHeader,
  PageShell,
  SectionHeader,
  Text,
  ThemePicker,
  XStack,
  YStack,
} from '@simplyfpl/ui';

const { useAuth } = auth;
const { useThemeMode } = themeFeature;

export function SettingsView() {
  const router = useRouter();
  const { session, user, isPro, isLoading, signOut } = useAuth();
  const { theme: activeTheme, setTheme } = useThemeMode();

  if (isLoading) {
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
        <SectionHeader title="Appearance" />
        <YStack gap={12} marginTop={8}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            Choose how SimplyFPL looks. Your choice is saved on this device and applies everywhere.
          </Text>
          <ThemePicker value={activeTheme} onSelect={setTheme} />
        </YStack>
      </Card>

      {session ? (
        <>
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
        </>
      ) : null}

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
