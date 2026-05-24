import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { ThemeName } from '@simplyfpl/types';

import { DEFAULT_THEME, getBrowserThemeStore, readStoredTheme, writeStoredTheme } from './theme';

interface ThemeModeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

interface ThemeModeProviderProps {
  children: ReactNode;
}

export function ThemeModeProvider({ children }: ThemeModeProviderProps) {
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);

  useEffect(() => {
    setThemeState(readStoredTheme(getBrowserThemeStore()));
  }, []);

  const setTheme = useCallback((next: ThemeName) => {
    setThemeState(next);
    writeStoredTheme(getBrowserThemeStore(), next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode(): ThemeModeContextValue {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeModeProvider');
  }
  return context;
}
