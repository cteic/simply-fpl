import { useCallback, useEffect, useState } from 'react';

import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'simplyfpl_last_entry_id';

export interface SavedTeamState {
  entryId: number | null;
  hydrated: boolean;
  save: (id: number) => void;
  clear: () => void;
}

/**
 * Native equivalent of the web app's localStorage-backed "last team ID".
 * Persists across launches via expo-secure-store.
 */
export function useSavedEntryId(): SavedTeamState {
  const [entryId, setEntryId] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        const parsed = raw === null ? NaN : Number(raw);
        if (Number.isInteger(parsed) && parsed > 0) setEntryId(parsed);
      })
      .catch(() => {
        // ignore — treat as no saved id
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback((id: number) => {
    setEntryId(id);
    void SecureStore.setItemAsync(STORAGE_KEY, String(id));
  }, []);

  const clear = useCallback(() => {
    setEntryId(null);
    void SecureStore.deleteItemAsync(STORAGE_KEY);
  }, []);

  return { entryId, hydrated, save, clear };
}
