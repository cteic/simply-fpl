import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

import type { Database, Tier } from '@simplyfpl/types';

type Client = SupabaseClient<Database>;

const ENTRY_ID_STORAGE_KEY = 'simplyfpl:lastEntryId';

export interface AuthContextValue {
  client: Client;
  session: Session | null;
  user: User | null;
  isPro: boolean;
  tier: Tier;
  isLoading: boolean;
  signInWithEmail: (email: string, redirectTo?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  client: Client;
  children: ReactNode;
}

export function computeIsPro(profile: { is_pro: boolean; pro_until: string | null }): boolean {
  const stillValid = profile.pro_until === null || new Date(profile.pro_until) > new Date();
  return profile.is_pro && stillValid;
}

interface EntryIdStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

// React Native defines `window` without `localStorage`, and browsers throw when storage is blocked.
function getEntryIdStorage(): EntryIdStorage | null {
  try {
    if (typeof window === 'undefined') return null;
    const storage: unknown = window.localStorage;
    if (typeof storage !== 'object' || storage === null) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readLocalEntryId(
  storage: EntryIdStorage | null = getEntryIdStorage()
): number | null {
  try {
    const raw = storage?.getItem(ENTRY_ID_STORAGE_KEY) ?? null;
    const parsed = raw ? Number(raw) : NaN;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocalEntryId(id: number, storage: EntryIdStorage | null = getEntryIdStorage()) {
  try {
    storage?.setItem(ENTRY_ID_STORAGE_KEY, String(id));
  } catch {
    // storage unavailable: the profile keeps the value
  }
}

export function clearLocalEntryId(storage: EntryIdStorage | null = getEntryIdStorage()) {
  try {
    storage?.removeItem(ENTRY_ID_STORAGE_KEY);
  } catch {
    // storage unavailable: nothing to clear
  }
}

// The saved team belongs to whoever set it. Once a signed-in user signs out, clear it so the
// next account to sign in on this device does not inherit it and overwrite its own profile.
export function shouldClearEntryIdOnSessionChange(
  previousUserId: string | null,
  nextUserId: string | null
): boolean {
  return previousUserId !== null && previousUserId !== nextUserId;
}

export function AuthProvider({ client, children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [tier, setTier] = useState<Tier>('free');
  const [isLoading, setIsLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    client.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      lastUserIdRef.current = data.session?.user.id ?? null;
      setSession(data.session);
      setIsLoading(false);
    });

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user.id ?? null;
      if (shouldClearEntryIdOnSessionChange(lastUserIdRef.current, nextUserId)) {
        clearLocalEntryId();
      }
      lastUserIdRef.current = nextUserId;
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
      setTier('free');
      return;
    }

    let cancelled = false;
    const userId = session.user.id;

    async function fetchAndSyncProfile() {
      const { data } = await client
        .from('profiles')
        .select('is_pro, pro_until, fpl_entry_id, tier')
        .eq('id', userId)
        .maybeSingle<{
          is_pro: boolean;
          pro_until: string | null;
          fpl_entry_id: number | null;
          tier: Tier;
        }>();
      if (cancelled || !data) return;

      setIsPro(computeIsPro(data));
      setTier(data.tier ?? 'free');

      const local = readLocalEntryId();
      const remote = data.fpl_entry_id;
      if (local !== null && local !== remote) {
        // localStorage wins — represents the user's most recent action on this device.
        await client.from('profiles').update({ fpl_entry_id: local }).eq('id', userId);
      } else if (local === null && remote !== null) {
        writeLocalEntryId(remote);
      }
    }

    fetchAndSyncProfile();

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
      tier,
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
    [client, session, isPro, tier, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
