'use client';

import { useState } from 'react';

import { auth } from '@simplyfpl/features';
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
        <PageHeader title="Signed in" meta={session.user.email ?? ''} />
        <Card paddingHorizontal={24} paddingVertical={24}>
          <Text fontFamily="$body" fontSize={14} color="$colorMuted">
            You're already signed in. Head to <a href="/leagues">Leagues</a> to start tracking.
          </Text>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader title="Sign in" meta="Magic link via email" />

      <Card paddingHorizontal={24} paddingVertical={24}>
        <SectionHeader title="Enter your email" />
        <YStack gap={12} marginTop={4}>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
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
            {status === 'sending' ? 'Sending…' : 'Send magic link'}
          </Button>
          {status === 'sent' ? (
            <Text fontFamily="$body" fontSize={13} color="$colorMuted">
              Check your inbox — click the link to finish signing in.
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
