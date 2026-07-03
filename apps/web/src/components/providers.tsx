'use client';

import { useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { auth } from '@simplyfpl/features';
import { LocaleProvider } from '@simplyfpl/i18n';
import type { SupportedLocale } from '@simplyfpl/i18n';

import { PostHogProvider } from '@/components/posthog-provider';
import { getSupabaseClient } from '@/lib/supabase';

const { AuthProvider } = auth;

interface ProvidersProps {
  children: React.ReactNode;
  initialLocale?: SupportedLocale;
}

export function Providers({ children, initialLocale }: ProvidersProps) {
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
    <LocaleProvider initialLocale={initialLocale}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider client={supabase}>
          <PostHogProvider>{children}</PostHogProvider>
        </AuthProvider>
      </QueryClientProvider>
    </LocaleProvider>
  );
}
