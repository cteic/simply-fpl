import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import * as SecureStore from 'expo-secure-store';

import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  LocaleProvider,
  isSupportedLocale,
  useLocale,
} from '@simplyfpl/i18n';
import type { SupportedLocale } from '@simplyfpl/i18n';

function LocaleStorageSyncer() {
  const { locale } = useLocale();

  useEffect(() => {
    SecureStore.setItemAsync(LOCALE_STORAGE_KEY, locale).catch(() => {});
  }, [locale]);

  return null;
}

interface MobileLocaleProviderProps {
  children: ReactNode;
}

export function MobileLocaleProvider({ children }: MobileLocaleProviderProps) {
  const [initialLocale, setInitialLocale] = useState<SupportedLocale>(DEFAULT_LOCALE);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(LOCALE_STORAGE_KEY)
      .then((stored) => {
        if (isSupportedLocale(stored)) setInitialLocale(stored);
      })
      .catch(() => {})
      .finally(() => setResolved(true));
  }, []);

  if (!resolved) return null;

  return (
    <LocaleProvider initialLocale={initialLocale}>
      <LocaleStorageSyncer />
      {children}
    </LocaleProvider>
  );
}
