import { useState } from 'react';

import type { ColorValue } from 'react-native';

import { useFonts } from 'expo-font';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { DMMono_300Light, DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Theme } from 'tamagui';

import { auth } from '@simplyfpl/features';
import { TamaguiProvider } from '@simplyfpl/ui';
import { config } from '@simplyfpl/ui/tamagui.config';

import { TabIcon } from '@/components/tab-icon';
import type { TabIconName } from '@/components/tab-icon';
import { MobileLocaleProvider } from '@/lib/mobile-locale-provider';
import { MobileThemeModeProvider, useMobileThemeMode } from '@/lib/mobile-theme-provider';
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

function tabIcon(name: TabIconName) {
  return function Icon({ color }: { color: ColorValue }) {
    return <TabIcon name={name} color={color} />;
  };
}

interface AppContentProps {
  queryClient: QueryClient;
}

function AppContent({ queryClient }: AppContentProps) {
  const { theme } = useMobileThemeMode();

  return (
    <Theme name={theme}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <MobileLocaleProvider>
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
                  // Eight tabs share a phone's width, so the label has to be
                  // small enough for "Leagues" and "Planner" not to truncate.
                  tabBarLabelStyle: { fontSize: 9.5, fontFamily: 'DMSans-Medium' },
                  headerStyle: { backgroundColor: COLORS.bg },
                  headerTintColor: COLORS.text,
                  headerShadowVisible: false,
                }}
              >
                <Tabs.Screen
                  name="index"
                  options={{
                    tabBarIcon: tabIcon('home'),
                    title: 'Live Rank',
                    tabBarLabel: 'Home',
                    headerShown: false,
                  }}
                />
                <Tabs.Screen
                  name="leagues"
                  options={{
                    tabBarIcon: tabIcon('leagues'),
                    title: 'Mini-Leagues',
                    tabBarLabel: 'Leagues',
                    headerShown: false,
                  }}
                />
                <Tabs.Screen
                  name="h2h"
                  options={{
                    tabBarIcon: tabIcon('h2h'),
                    title: 'Head to Head',
                    tabBarLabel: 'H2H',
                    headerShown: false,
                  }}
                />
                <Tabs.Screen
                  name="planner"
                  options={{
                    tabBarIcon: tabIcon('planner'),
                    title: 'Transfer Planner',
                    tabBarLabel: 'Planner',
                  }}
                />
                <Tabs.Screen
                  name="prices"
                  options={{
                    tabBarIcon: tabIcon('prices'),
                    title: 'Price Changes',
                    tabBarLabel: 'Prices',
                    headerShown: false,
                  }}
                />
                <Tabs.Screen
                  name="threats"
                  options={{
                    tabBarIcon: tabIcon('threats'),
                    title: 'Threats',
                    tabBarLabel: 'Threats',
                    headerShown: false,
                  }}
                />
                <Tabs.Screen
                  name="frank"
                  options={{
                    tabBarIcon: tabIcon('frank'),
                    title: 'Frank',
                    tabBarLabel: 'Frank',
                    headerShown: false,
                  }}
                />
                <Tabs.Screen
                  name="profile"
                  options={{
                    tabBarIcon: tabIcon('profile'),
                    title: 'Profile',
                    tabBarLabel: 'Profile',
                  }}
                />
                <Tabs.Screen name="rivals/[leagueId]" options={{ title: 'Rivals', href: null }} />
                <Tabs.Screen name="login" options={{ title: 'Sign In', href: null }} />
                <Tabs.Screen name="auth/callback" options={{ title: 'Signing In', href: null }} />
              </Tabs>
            </AuthProvider>
          </MobileLocaleProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </Theme>
  );
}

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
      <MobileThemeModeProvider>
        <AppContent queryClient={queryClient} />
      </MobileThemeModeProvider>
    </TamaguiProvider>
  );
}
