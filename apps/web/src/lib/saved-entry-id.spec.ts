import { afterEach, describe, expect, it, vi } from 'vitest';

import { SAVED_ENTRY_ID_KEY, readSavedEntryId, setSavedEntryId } from './saved-entry-id';

const CHANGE_EVENT = 'simplyfpl:entry-id-changed';

// The web test env is `node` (no DOM), so stub the slice of `window` the
// saved-entry-id helpers touch: localStorage + the event bus they use to keep
// the nav in sync when a team is selected/deselected.
function installFakeWindow(): { store: Map<string, string> } {
  const store = new Map<string, string>();
  const listeners = new Map<string, Array<() => void>>();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string): string | null => store.get(key) ?? null,
      setItem: (key: string, value: string): void => {
        store.set(key, value);
      },
      removeItem: (key: string): void => {
        store.delete(key);
      },
    },
    addEventListener: (type: string, fn: () => void): void => {
      listeners.set(type, [...(listeners.get(type) ?? []), fn]);
    },
    removeEventListener: (): void => {},
    dispatchEvent: (event: Event): boolean => {
      for (const fn of listeners.get(event.type) ?? []) fn();
      return true;
    },
  });
  return { store };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('saved entry id', () => {
  it('reads a valid saved id', () => {
    const { store } = installFakeWindow();
    store.set(SAVED_ENTRY_ID_KEY, '219895');
    expect(readSavedEntryId()).toBe(219895);
  });

  it('returns null when unset or invalid', () => {
    const { store } = installFakeWindow();
    expect(readSavedEntryId()).toBeNull();
    store.set(SAVED_ENTRY_ID_KEY, 'nope');
    expect(readSavedEntryId()).toBeNull();
    store.set(SAVED_ENTRY_ID_KEY, '0');
    expect(readSavedEntryId()).toBeNull();
  });

  it('writes the id and notifies subscribers when a team is selected', () => {
    installFakeWindow();
    const listener = vi.fn();
    window.addEventListener(CHANGE_EVENT, listener);
    setSavedEntryId(219895);
    expect(readSavedEntryId()).toBe(219895);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('clears the id and notifies subscribers when a team is deselected', () => {
    const { store } = installFakeWindow();
    store.set(SAVED_ENTRY_ID_KEY, '219895');
    const listener = vi.fn();
    window.addEventListener(CHANGE_EVENT, listener);
    setSavedEntryId(null);
    expect(readSavedEntryId()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
