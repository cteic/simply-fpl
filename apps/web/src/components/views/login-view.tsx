'use client';

import { useState } from 'react';

import { auth } from '@simplyfpl/features';
import { t } from '@simplyfpl/i18n';
import {
  Button,
  Card,
  Input,
  PageHeader,
  PageShell,
  SectionHeader,
  Text,
  YStack,
} from '@simplyfpl/ui';

const { useAuth } = auth;

export function LoginView() {
  const { signInWithEmail, session } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email) return;
    setStatus('sending');
    setErrorMessage(null);
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
    const { error } = await signInWithEmail(email, redirectTo);
    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
      return;
    }
    setStatus('sent');
  }

  if (session) {
    return (
      <PageShell>
        <PageHeader title={t('login.signed_in_title')} meta={session.user.email ?? ''} />
        <Card paddingHorizontal={24} paddingVertical={24}>
          <Text fontFamily="$body" fontSize={14} color="$colorMuted">
            {t('login.already_signed_in')}
          </Text>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader tone="stadium" title={t('login.page_title')} meta={t('login.page_meta')} />

      <Card paddingHorizontal={24} paddingVertical={24}>
        <SectionHeader title={t('login.email_label')} />
        <YStack gap={12} marginTop={4}>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder={t('login.email_placeholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            borderColor="$borderStrong"
            backgroundColor="$background"
          />
          <Button
            tone="primary"
            size="md"
            onPress={() => {
              handleSubmit();
            }}
          >
            {status === 'sending' ? t('login.sending') : t('login.send_link')}
          </Button>
          {status === 'sent' ? (
            <Text fontFamily="$body" fontSize={13} color="$colorMuted">
              {t('login.success')}
            </Text>
          ) : null}
          {status === 'error' && errorMessage ? (
            <Text fontFamily="$body" fontSize={13} color="$danger">
              {errorMessage}
            </Text>
          ) : null}
        </YStack>
      </Card>
    </PageShell>
  );
}
