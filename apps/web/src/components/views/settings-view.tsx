'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { auth, theme as themeFeature } from '@simplyfpl/features';
import { t } from '@simplyfpl/i18n';
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

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/login');
    }
  }, [isLoading, session, router]);

  if (isLoading || !session) {
    return (
      <PageShell>
        <PageHeader title={t('settings.title')} meta={t('settings.loading_meta')} />
      </PageShell>
    );
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/');
  }

  return (
    <PageShell>
      <PageHeader tone="stadium" title={t('settings.title')} meta={user?.email ?? ''} />

      <Card paddingHorizontal={24} paddingVertical={20} marginBottom={20}>
        <SectionHeader title={t('settings.account_section')} />
        <YStack gap={10} marginTop={8}>
          <Row label={t('settings.email_label')} value={user?.email ?? '—'} />
          <Row
            label={t('settings.plan_label')}
            value={isPro ? t('settings.plan_pro') : t('settings.plan_free')}
          />
        </YStack>
      </Card>

      <Card paddingHorizontal={24} paddingVertical={20} marginBottom={20}>
        <SectionHeader title={t('settings.appearance_section')} />
        <YStack gap={12} marginTop={8}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            {t('settings.appearance_body')}
          </Text>
          <ThemePicker value={activeTheme} onSelect={setTheme} />
        </YStack>
      </Card>

      <Card paddingHorizontal={24} paddingVertical={20} marginBottom={20}>
        <SectionHeader title={t('settings.session_section')} />
        <YStack gap={10} marginTop={8}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            {t('settings.session_body')}
          </Text>
          <XStack>
            <Button
              tone="ghost"
              size="md"
              onPress={() => {
                handleSignOut();
              }}
            >
              {t('settings.sign_out')}
            </Button>
          </XStack>
        </YStack>
      </Card>

      <FNote>{t('settings.more_coming')}</FNote>
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
