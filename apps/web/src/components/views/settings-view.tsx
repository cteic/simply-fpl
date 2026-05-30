'use client';

import { useEffect, useState } from 'react';

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

type BillingPortalState = 'idle' | 'opening' | 'error';

function readBillingPortalUrl(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null;
  if (!('url' in value)) return null;

  const url = value.url;
  return typeof url === 'string' && url.length > 0 ? url : null;
}

export function SettingsView() {
  const router = useRouter();
  const { session, user, isPro, isLoading, signOut } = useAuth();
  const { theme: activeTheme, setTheme } = useThemeMode();
  const [billingPortalState, setBillingPortalState] = useState<BillingPortalState>('idle');

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

  async function handleBillingPortal() {
    setBillingPortalState('opening');
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' });
      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      const url = readBillingPortalUrl(payload);
      if (!response.ok || !url) {
        setBillingPortalState('error');
        return;
      }

      window.location.assign(url);
    } catch {
      setBillingPortalState('error');
    }
  }

  return (
    <PageShell>
      <PageHeader tone="stadium" title="Settings" meta={user?.email ?? ''} />

      <Card paddingHorizontal={24} paddingVertical={20} marginBottom={20}>
        <SectionHeader title="Account" />
        <YStack gap={10} marginTop={8}>
          <Row label="Email" value={user?.email ?? '—'} />
          <Row label="Plan" value={isPro ? 'Pro' : 'Free'} />
          {isPro ? (
            <YStack gap={8} marginTop={4}>
              <XStack>
                <Button
                  tone="ghost"
                  size="md"
                  onPress={() => {
                    handleBillingPortal();
                  }}
                >
                  {billingPortalState === 'opening' ? 'Opening billing…' : 'Manage billing'}
                </Button>
              </XStack>
              {billingPortalState === 'error' ? (
                <Text fontFamily="$body" fontSize={12} color="$colorMuted">
                  Billing portal is not available for this account yet.
                </Text>
              ) : null}
            </YStack>
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
