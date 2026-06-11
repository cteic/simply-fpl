import { useEffect } from 'react';

import { router, useLocalSearchParams } from 'expo-router';

import { Text, YStack } from '@simplyfpl/ui';

import { Screen } from '@/components/screen';
import { supabaseClient } from '@/lib/supabase';

export default function AuthCallback() {
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();

  useEffect(() => {
    const code = params.code;
    if (!code) return;

    supabaseClient.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          router.replace('/login');
        } else {
          router.replace('/profile');
        }
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [params.code]);

  const failed = params.error !== undefined;

  return (
    <Screen>
      <YStack flex={1} alignItems="center" justifyContent="center" paddingVertical={60}>
        <Text fontFamily="$body" fontSize={13} color={failed ? '$danger' : '$colorMuted'}>
          {failed ? 'Sign in failed. Please try again.' : 'Finishing sign in…'}
        </Text>
      </YStack>
    </Screen>
  );
}
