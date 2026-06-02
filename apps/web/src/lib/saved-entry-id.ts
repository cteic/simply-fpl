'use client';

import { useEffect, useState } from 'react';

export const SAVED_ENTRY_ID_KEY = 'simplyfpl:lastEntryId';
const CHANGE_EVENT = 'simplyfpl:entry-id-changed';

export function readSavedEntryId(): number | null {
  if (typeof window === 'undefined') return null;
  const saved = window.localStorage.getItem(SAVED_ENTRY_ID_KEY);
  const id = saved ? Number(saved) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Single writer for the saved team id. Writing here also notifies every
 * `useSavedEntryId` subscriber in the same tab (localStorage + the native
 * `storage` event only fire cross-tab), so the nav and the page never desync
 * when a team is selected or deselected.
 */
export function setSavedEntryId(entryId: number | null): void {
  if (typeof window === 'undefined') return;
  if (entryId === null) {
    window.localStorage.removeItem(SAVED_ENTRY_ID_KEY);
  } else {
    window.localStorage.setItem(SAVED_ENTRY_ID_KEY, String(entryId));
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Reactive read of the saved team id — re-renders on select/deselect. */
export function useSavedEntryId(): number | null {
  const [entryId, setEntryId] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => setEntryId(readSavedEntryId());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return entryId;
}
