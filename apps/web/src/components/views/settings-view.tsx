'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { auth, push, subscriptions, theme as themeFeature } from '@simplyfpl/features';
import { useLocale, useTranslation } from '@simplyfpl/i18n';
import {
  Button,
  Card,
  FNote,
  LocaleSwitcher,
  NotificationsSettings,
  PageHeader,
  PageShell,
  SectionHeader,
  Text,
  ThemePicker,
  XStack,
  YStack,
} from '@simplyfpl/ui';

import { FEATURE_WEB_PUSH, VAPID_PUBLIC_KEY } from '@/lib/feature-flags';

const { useAuth } = auth;
const { isPro } = subscriptions;
const { useThemeMode } = themeFeature;
const { useNotificationsOptIn } = push;

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
  const notifications = useNotificationsOptIn({ vapidPublicKey: VAPID_PUBLIC_KEY });
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/login');
    }
  }, [isLoading, session, router]);

  if (isLoading || !session) {
    return (
      <PageShell>
        <PageHeader title={t('settings.title')} meta={t('common.loading')} />
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
      // Stripe customer portal is an external URL; bypass typed-routes.
      window.location.href = data.url;
    } catch {
      setPortalError('Network error. Please try again.');
    } finally {
      setPortalLoading(false);
    }
  }

  let planLabel = t('settings.plan_free');
  if (tier === 'ultimate') planLabel = t('settings.plan_ultimate');
  else if (tier === 'pro') planLabel = t('settings.plan_pro');

  return (
    <PageShell>
      <PageHeader tone="stadium" title={t('settings.title')} meta={user?.email ?? ''} />

      <Card paddingHorizontal={24} paddingVertical={20} marginBottom={20}>
        <SectionHeader title={t('settings.section_account')} />
        <YStack gap={10} marginTop={8}>
          <Row label={t('settings.label_email')} value={user?.email ?? '—'} />
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
              {t('settings.label_plan')}
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
                {t('settings.cta_upgrade')}
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
                {portalLoading ? t('settings.cta_opening') : t('settings.cta_manage_subscription')}
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
        <SectionHeader title={t('settings.section_appearance')} />
        <YStack gap={12} marginTop={8}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            {t('settings.appearance_description')}
          </Text>
          <ThemePicker value={activeTheme} onSelect={setTheme} />
        </YStack>
      </Card>

      <Card paddingHorizontal={24} paddingVertical={20} marginBottom={20}>
        <SectionHeader title={t('settings.section_language')} />
        <YStack gap={12} marginTop={8}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            {t('settings.language_description')}
          </Text>
          <LocaleSwitcher value={locale} onSelect={setLocale} />
        </YStack>
      </Card>

      <Card paddingHorizontal={24} paddingVertical={20} marginBottom={20}>
        <SectionHeader title={t('settings.section_session')} />
        <YStack gap={10} marginTop={8}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            {t('settings.session_description')}
          </Text>
          <XStack>
            <Button
              tone="ghost"
              size="md"
              onPress={() => {
                void handleSignOut();
              }}
            >
              {t('settings.cta_sign_out')}
            </Button>
          </XStack>
        </YStack>
      </Card>

      {FEATURE_WEB_PUSH ? (
        <Card paddingHorizontal={24} paddingVertical={20} marginBottom={20}>
          <SectionHeader title={t('settings.section_notifications')} />
          <YStack gap={12} marginTop={8}>
            <NotificationsSettings
              isPro={isPro(tier)}
              permission={notifications.permission}
              isSubscribed={notifications.isSubscribed}
              isLoading={notifications.isLoading}
              prefs={notifications.prefs}
              error={notifications.error}
              onSubscribe={() => {
                notifications.subscribe();
              }}
              onUnsubscribe={() => {
                notifications.unsubscribe();
              }}
              onTogglePref={(key, value) => {
                notifications.updatePrefs({ [key]: value });
              }}
            />
          </YStack>
        </Card>
      ) : null}

      <FNote>{t('settings.fnote')}</FNote>
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
