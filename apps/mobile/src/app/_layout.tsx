import { useState } from 'react';

import { useFonts } from 'expo-font';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { DMMono_300Light, DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { auth } from '@simplyfpl/features';
import { TamaguiProvider } from '@simplyfpl/ui';
import { config } from '@simplyfpl/ui/tamagui.config';

import { supabaseClient } from '@/lib/supabase';

const { AuthProvider } = auth;

const COLORS = {
  bg: '#F7F7F5',
  surface: '#FFFFFF',
  border: '#E9E8E4',
  brand: '#0F766E',
  text: '#1A1A18',
  inactive: '#A8A8A0',
};

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 55_000,
            retry: 2,
          },
        },
      })
  );

  // Register DM Sans / DM Mono under the exact face names the shared Tamagui
  // config references (see packages/ui/tamagui.config.ts -> createFont face).
  // DM Sans (static) ships 400/500/700 only — map the config's SemiBold face
  // to Medium so every face name the Tamagui config references resolves.
  const [fontsLoaded, fontError] = useFonts({
    'DMSans-Regular': DMSans_400Regular,
    'DMSans-Medium': DMSans_500Medium,
    'DMSans-SemiBold': DMSans_500Medium,
    'DMSans-Bold': DMSans_700Bold,
    'DMMono-Light': DMMono_300Light,
    'DMMono-Regular': DMMono_400Regular,
    'DMMono-Medium': DMMono_500Medium,
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <TamaguiProvider config={config} defaultTheme="stadium">
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider client={supabaseClient}>
            <StatusBar style="dark" />
            <Tabs
              screenOptions={{
                tabBarStyle: {
                  backgroundColor: COLORS.surface,
                  borderTopColor: COLORS.border,
                },
                tabBarActiveTintColor: COLORS.brand,
                tabBarInactiveTintColor: COLORS.inactive,
                headerStyle: { backgroundColor: COLORS.bg },
                headerTintColor: COLORS.text,
                headerShadowVisible: false,
              }}
            >
              <Tabs.Screen
                name="index"
                options={{ title: 'Live Rank', tabBarLabel: 'Home', headerShown: false }}
              />
              <Tabs.Screen
                name="leagues"
                options={{ title: 'Mini-Leagues', tabBarLabel: 'Leagues', headerShown: false }}
              />
              <Tabs.Screen name="h2h" options={{ title: 'Head to Head', tabBarLabel: 'H2H' }} />
              <Tabs.Screen
                name="planner"
                options={{ title: 'Transfer Planner', tabBarLabel: 'Planner' }}
              />
              <Tabs.Screen
                name="prices"
                options={{ title: 'Price Changes', tabBarLabel: 'Prices' }}
              />
              <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarLabel: 'Profile' }} />
              <Tabs.Screen name="rivals/[leagueId]" options={{ title: 'Rivals', href: null }} />
              <Tabs.Screen name="login" options={{ title: 'Sign In', href: null }} />
              <Tabs.Screen name="auth/callback" options={{ title: 'Signing In', href: null }} />
            </Tabs>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </TamaguiProvider>
  );
}
