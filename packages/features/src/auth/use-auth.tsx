import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

import type { Database } from '@simplyfpl/types';

type Client = SupabaseClient<Database>;

export interface AuthProfile {
  fplEntryId: number | null;
  isPro: boolean;
  proUntil: string | null;
}

interface AuthContextValue {
  client: Client;
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  isPro: boolean;
  isLoading: boolean;
  isProfileLoading: boolean;
  signInWithEmail: (email: string, redirectTo?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (
    patch: Partial<{ fplEntryId: number | null }>
  ) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  client: Client;
  children: ReactNode;
}

export function AuthProvider({ client, children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

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

  const fetchProfile = useCallback(
    async (userId: string) => {
      setIsProfileLoading(true);
      const { data } = await client
        .from('profiles')
        .select('fpl_entry_id, is_pro, pro_until')
        .eq('id', userId)
        .maybeSingle<{
          fpl_entry_id: number | null;
          is_pro: boolean;
          pro_until: string | null;
        }>();
      setIsProfileLoading(false);
      if (!data) {
        setProfile({ fplEntryId: null, isPro: false, proUntil: null });
        return;
      }
      setProfile({
        fplEntryId: data.fpl_entry_id,
        isPro: data.is_pro,
        proUntil: data.pro_until,
      });
    },
    [client]
  );

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }
    fetchProfile(session.user.id);
  }, [session?.user, fetchProfile]);

  const isPro = useMemo(() => {
    if (!profile) return false;
    if (!profile.isPro) return false;
    if (profile.proUntil === null) return true;
    return new Date(profile.proUntil) > new Date();
  }, [profile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      client,
      session,
      user: session?.user ?? null,
      profile,
      isPro,
      isLoading,
      isProfileLoading,
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
      updateProfile: async (patch) => {
        if (!session?.user) return { error: new Error('Not signed in') };
        const dbPatch: { fpl_entry_id?: number | null } = {};
        if ('fplEntryId' in patch) dbPatch.fpl_entry_id = patch.fplEntryId ?? null;
        const { error } = await client.from('profiles').update(dbPatch).eq('id', session.user.id);
        if (error) return { error: new Error(error.message) };
        await fetchProfile(session.user.id);
        return { error: null };
      },
      refreshProfile: async () => {
        if (!session?.user) return;
        await fetchProfile(session.user.id);
      },
    }),
    [client, session, profile, isPro, isLoading, isProfileLoading, fetchProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
