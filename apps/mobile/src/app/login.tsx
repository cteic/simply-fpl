import { useState } from 'react';

import { router } from 'expo-router';

import { auth } from '@simplyfpl/features';
import { Button, Card, FNote, Input, SectionHeader, Text, YStack } from '@simplyfpl/ui';

import { Screen } from '@/components/screen';

const { useAuth } = auth;

const REDIRECT_URL = 'simplyfpl://auth/callback';

export default function LoginScreen() {
  const { signInWithEmail, session } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (session) {
    router.replace('/profile');
    return null;
  }

  async function handleSubmit() {
    if (!email) return;
    setStatus('sending');
    setErrorMessage(null);
    const { error } = await signInWithEmail(email, REDIRECT_URL);
    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
      return;
    }
    setStatus('sent');
  }

  return (
    <Screen>
      <YStack>
        <Text fontFamily="$body" fontSize={21} fontWeight="600" letterSpacing={-0.4} color="$color">
          Sign in
        </Text>
        <Text fontFamily="$body" fontSize={12} color="$colorMuted" marginTop={4}>
          Magic link via email
        </Text>
      </YStack>

      <Card paddingHorizontal={20} paddingVertical={18}>
        <SectionHeader title="Enter your email" />
        <YStack gap={10} marginTop={8}>
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

      <FNote>A sign-in link will be emailed to you. No password needed.</FNote>
    </Screen>
  );
}
