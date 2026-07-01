import type { ReactNode } from 'react';

import enTranslations from './locales/en.json';

export type TranslationKey = keyof typeof enTranslations;
type Vars = Record<string, string | number>;

function interpolate(template: string, vars: Vars): string {
  let result = template;
  for (const [k, v] of Object.entries(vars)) {
    result = result.replaceAll(`{{${k}}}`, String(v));
  }
  return result;
}

export function t(key: TranslationKey, vars?: Vars): string {
  const raw: string = enTranslations[key];
  if (!vars) return raw;
  return interpolate(raw, vars);
}

export function useTranslation(): { t: typeof t } {
  return { t };
}

interface TranslationProviderProps {
  children: ReactNode;
}

export function TranslationProvider({ children }: TranslationProviderProps): ReactNode {
  return children;
}
