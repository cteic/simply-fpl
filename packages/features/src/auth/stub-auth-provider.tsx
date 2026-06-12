import { createElement } from 'react';
import type { ContextType, ReactNode } from 'react';

import { createClient } from '@supabase/supabase-js';

import type { Database, Tier } from '@simplyfpl/types';

import { AuthContext } from './use-auth';

type AuthContextValue = NonNullable<ContextType<typeof AuthContext>>;

interface StubAuthProviderProps {
  tier?: Tier;
  isPro?: boolean;
  children: ReactNode;
}

export function StubAuthProvider({
  tier = 'free',
  isPro = false,
  children,
}: StubAuthProviderProps) {
  const value: AuthContextValue = {
    client: createClient<Database>('https://stub.supabase.co', 'stub-anon-key'),
    session: null,
    user: null,
    isPro,
    tier,
    isLoading: false,
    signInWithEmail: async () => ({ error: null }),
    signOut: async () => {},
  };
  return createElement(AuthContext.Provider, { value }, children);
}
