'use client';

import { useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { auth } from '@simplyfpl/features';

import { getSupabaseClient } from '@/lib/supabase';

const { AuthProvider } = auth;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 55_000,
            refetchInterval: false, // individual queries set their own intervals
            retry: 2,
          },
        },
      })
  );
  const [supabase] = useState(() => getSupabaseClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider client={supabase}>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
