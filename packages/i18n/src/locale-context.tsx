'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  isSupportedLocale,
  parseAcceptLanguage,
} from './locale-registry';
import type { SupportedLocale } from './locale-registry';
import type { TranslationKey } from './translate';
import { loadLocale, t } from './translate';

type Vars = Record<string, string | number>;

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

interface LocaleProviderProps {
  children: ReactNode;
  initialLocale?: SupportedLocale | undefined;
}

export function LocaleProvider({ children, initialLocale }: LocaleProviderProps): ReactNode {
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale ?? DEFAULT_LOCALE);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      const detected = isSupportedLocale(stored)
        ? stored
        : parseAcceptLanguage(window.navigator.languages.join(','));
      void loadLocale(detected).then(() => setLocaleState(detected));
    } catch {}
  }, []);

  const setLocale = useCallback((next: SupportedLocale) => {
    void loadLocale(next).then(() => setLocaleState(next));
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
      }
    } catch {}
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function TranslationProvider({ children, initialLocale }: LocaleProviderProps): ReactNode {
  return <LocaleProvider initialLocale={initialLocale}>{children}</LocaleProvider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used within a LocaleProvider');
  return context;
}

export function useTranslation(): {
  t: (key: TranslationKey, vars?: Vars) => string;
  locale: SupportedLocale;
} {
  const { locale } = useLocale();
  return useMemo(
    () => ({
      t: (key: TranslationKey, vars?: Vars) => t(key, vars, locale),
      locale,
    }),
    [locale]
  );
}
