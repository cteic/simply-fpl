import { useCallback, useEffect, useState } from 'react';

import type { SelectRivalsOptions } from './select-rivals';

export const WINDOW_OPTIONS = [3, 5, 10] as const;
export type WindowSize = (typeof WINDOW_OPTIONS)[number];
export const DEFAULT_WINDOW_SIZE: WindowSize = 5;

export function windowSizeToSelectOptions(size: WindowSize): SelectRivalsOptions {
  const above = Math.floor((size - 1) / 2);
  const below = size - 1 - above;
  return { above, below };
}

function storageKey(userId: string | null): string {
  return `simplyfpl:rivalsWindow:${userId ?? 'anon'}`;
}

export function readWindowSize(userId: string | null): WindowSize {
  const storage = globalThis.localStorage;
  if (typeof storage === 'undefined' || storage === null) return DEFAULT_WINDOW_SIZE;
  const raw = storage.getItem(storageKey(userId));
  const parsed = raw ? Number(raw) : NaN;
  if ((WINDOW_OPTIONS as readonly number[]).includes(parsed)) return parsed as WindowSize;
  return DEFAULT_WINDOW_SIZE;
}

export function writeWindowSize(userId: string | null, size: WindowSize): void {
  const storage = globalThis.localStorage;
  if (typeof storage === 'undefined' || storage === null) return;
  storage.setItem(storageKey(userId), String(size));
}

export function useRivalsWindowSize(
  userId: string | null,
  isPro: boolean
): [WindowSize, (size: WindowSize) => void] {
  const [windowSize, setWindowSize] = useState<WindowSize>(DEFAULT_WINDOW_SIZE);

  useEffect(() => {
    if (!isPro) {
      setWindowSize(DEFAULT_WINDOW_SIZE);
      return;
    }
    setWindowSize(readWindowSize(userId));
  }, [isPro, userId]);

  const setAndPersist = useCallback(
    (size: WindowSize) => {
      setWindowSize(size);
      if (isPro) writeWindowSize(userId, size);
    },
    [userId, isPro]
  );

  return [windowSize, setAndPersist];
}
