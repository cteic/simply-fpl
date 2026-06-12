import { type ReactNode } from 'react';

import en from './locales/en.json';

type Vars = Record<string, string | number>;

type TranslationKey = keyof typeof en;

export function t(key: TranslationKey, vars?: Vars): string {
  const raw = en[key];
  if (!vars) return raw;
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{{${k}}}`, String(v)), raw);
}

export function useTranslation() {
  return { t };
}

interface TranslationProviderProps {
  children: ReactNode;
}

export function TranslationProvider({ children }: TranslationProviderProps): ReactNode {
  return children;
}
