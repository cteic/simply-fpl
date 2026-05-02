import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

import type { Database } from '@simplyfpl/types';

type Client = SupabaseClient<Database>;

interface AuthContextValue {
  client: Client;
  session: Session | null;
  user: User | null;
  isPro: boolean;
  isLoading: boolean;
  signInWithEmail: (email: string, redirectTo?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  client: Client;
  children: ReactNode;
}

export function AuthProvider({ client, children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    client.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    if (!session?.user) {
      setIsPro(false);
      return;
    }

    let cancelled = false;
    const userId = session.user.id;

    async function fetchProfile() {
      const { data } = await client
        .from('profiles')
        .select('is_pro, pro_until')
        .eq('id', userId)
        .maybeSingle<{ is_pro: boolean; pro_until: string | null }>();
      if (cancelled || !data) return;
      const stillValid = data.pro_until === null || new Date(data.pro_until) > new Date();
      setIsPro(data.is_pro && stillValid);
    }

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [client, session?.user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      client,
      session,
      user: session?.user ?? null,
      isPro,
      isLoading,
      signInWithEmail: async (email, redirectTo) => {
        const { error } = await client.auth.signInWithOtp({
          email,
          ...(redirectTo ? { options: { emailRedirectTo: redirectTo } } : {}),
        });
        return { error };
      },
      signOut: async () => {
        await client.auth.signOut();
      },
    }),
    [client, session, isPro, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
