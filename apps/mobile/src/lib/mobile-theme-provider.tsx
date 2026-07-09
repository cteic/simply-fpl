import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import * as SecureStore from 'expo-secure-store';

import { theme as themeFeature } from '@simplyfpl/features';
import type { ThemeName } from '@simplyfpl/types';

const { DEFAULT_THEME, THEME_STORAGE_KEY, isThemeName } = themeFeature;

interface ThemeModeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

interface MobileThemeModeProviderProps {
  children: ReactNode;
}

export function MobileThemeModeProvider({ children }: MobileThemeModeProviderProps) {
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);

  useEffect(() => {
    SecureStore.getItemAsync(THEME_STORAGE_KEY)
      .then((stored) => {
        if (isThemeName(stored)) setThemeState(stored);
      })
      .catch(() => {});
  }, []);

  const setTheme = useCallback((next: ThemeName) => {
    setThemeState(next);
    SecureStore.setItemAsync(THEME_STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useMobileThemeMode(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useMobileThemeMode must be used within MobileThemeModeProvider');
  return ctx;
}
