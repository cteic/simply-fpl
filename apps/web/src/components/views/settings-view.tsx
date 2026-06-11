'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { auth, subscriptions, theme as themeFeature } from '@simplyfpl/features';
import {
  Button,
  Card,
  PageHeader,
  PageShell,
  SectionHeader,
  Text,
  ThemePicker,
  XStack,
  YStack,
} from '@simplyfpl/ui';

const { useAuth } = auth;
const { isPro } = subscriptions;
const { useThemeMode } = themeFeature;

function TierChip({ tier }: { tier: string }) {
  if (tier === 'free') return null;
  return (
    <XStack
      backgroundColor="$brandBg"
      borderWidth={1}
      borderStyle="solid"
      borderColor="$brand"
      borderRadius={4}
      paddingHorizontal={6}
      paddingVertical={2}
      alignItems="center"
    >
      <Text fontFamily="$body" fontSize={9} fontWeight="700" color="$brand" letterSpacing={0.8}>
        {tier.toUpperCase()}
      </Text>
    </XStack>
  );
}

export function SettingsView() {
  const router = useRouter();
  const { session, user, tier, isLoading, signOut } = useAuth();
  const { theme: activeTheme, setTheme } = useThemeMode();
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

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

  async function handleManageSubscription() {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setPortalError(body.error ?? 'Could not open billing portal.');
        return;
      }
      const data = (await res.json()) as { url: string };
      router.push(data.url);
    } catch {
      setPortalError('Network error. Please try again.');
    } finally {
      setPortalLoading(false);
    }
  }

  let planLabel = 'Free';
  if (tier === 'ultimate') planLabel = 'Ultimate';
  else if (tier === 'pro') planLabel = 'Pro';

  return (
    <PageShell>
      <PageHeader tone="stadium" title="Settings" meta={user?.email ?? ''} />

      <Card paddingHorizontal={24} paddingVertical={20} marginBottom={20}>
        <SectionHeader title="Account" />
        <YStack gap={10} marginTop={8}>
          <Row label="Email" value={user?.email ?? '—'} />
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
              Plan
            </Text>
            <XStack gap={8} alignItems="center">
              <Text fontFamily="$body" fontSize={13} color="$color">
                {planLabel}
              </Text>
              <TierChip tier={tier} />
            </XStack>
          </XStack>
        </YStack>
        <YStack gap={8} marginTop={16}>
          {tier === 'free' ? (
            <XStack>
              <Button tone="primary" size="md" onPress={() => router.push('/upgrade')}>
                Upgrade to Pro or Ultimate
              </Button>
            </XStack>
          ) : null}
          {isPro(tier) ? (
            <XStack>
              <Button
                tone="ghost"
                size="md"
                onPress={() => {
                  if (!portalLoading) void handleManageSubscription();
                }}
              >
                {portalLoading ? 'Opening…' : 'Manage subscription'}
              </Button>
            </XStack>
          ) : null}
          {portalError ? (
            <Text fontFamily="$body" fontSize={12} color="$negative">
              {portalError}
            </Text>
          ) : null}
        </YStack>
      </Card>

      <Card paddingHorizontal={24} paddingVertical={20} marginBottom={20}>
        <SectionHeader title="Appearance" />
        <YStack gap={12} marginTop={8}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            Choose how SimplyFPL looks. Your choice is saved on this device and applies everywhere.
          </Text>
          <ThemePicker value={activeTheme} onSelect={setTheme} />
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
                void handleSignOut();
              }}
            >
              Sign out
            </Button>
          </XStack>
        </YStack>
      </Card>
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
