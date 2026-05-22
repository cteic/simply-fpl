import type { ThemeName } from '@simplyfpl/types';

export type { ThemeName };

export const THEME_NAMES: readonly ThemeName[] = ['stadium', 'bold', 'quiet'];
export const DEFAULT_THEME: ThemeName = 'stadium';
export const THEME_STORAGE_KEY = 'simplyfpl:theme';

export interface ThemeStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function isThemeName(value: unknown): value is ThemeName {
  return value === 'stadium' || value === 'bold' || value === 'quiet';
}

export function readStoredTheme(store: ThemeStore | null | undefined): ThemeName {
  if (!store) return DEFAULT_THEME;
  try {
    const stored = store.getItem(THEME_STORAGE_KEY);
    if (isThemeName(stored)) return stored;
    return DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function writeStoredTheme(store: ThemeStore | null | undefined, theme: ThemeName): void {
  if (!store) return;
  try {
    store.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

export function getBrowserThemeStore(): ThemeStore | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
