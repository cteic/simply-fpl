import { useState } from 'react';

import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: '#0f1117',
            borderTopColor: '#1e2330',
          },
          tabBarActiveTintColor: '#00d4a0',
          tabBarInactiveTintColor: '#6b7280',
          headerStyle: { backgroundColor: '#0f1117' },
          headerTintColor: '#f9fafb',
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Live Rank', tabBarLabel: 'Rank' }} />
        <Tabs.Screen name="prices" options={{ title: 'Price Changes', tabBarLabel: 'Prices' }} />
        <Tabs.Screen name="leagues" options={{ title: 'Mini-Leagues', tabBarLabel: 'Leagues' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarLabel: 'Profile' }} />
      </Tabs>
    </QueryClientProvider>
  );
}
