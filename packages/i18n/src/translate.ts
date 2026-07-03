import type { SupportedLocale } from './locale-registry';
import { DEFAULT_LOCALE } from './locale-registry';
import deTranslations from './locales/de.json';
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import frTranslations from './locales/fr.json';

export type TranslationKey = keyof typeof enTranslations;
type Vars = Record<string, string | number>;

export const LOCALE_TRANSLATIONS: Record<SupportedLocale, Record<string, string>> = {
  en: enTranslations,
  fr: frTranslations,
  de: deTranslations,
  es: esTranslations,
};

function interpolate(template: string, vars: Vars): string {
  let result = template;
  for (const [k, v] of Object.entries(vars)) {
    result = result.replaceAll(`{{${k}}}`, String(v));
  }
  return result;
}

export function t(
  key: TranslationKey,
  vars?: Vars,
  locale: SupportedLocale = DEFAULT_LOCALE
): string {
  const dict = LOCALE_TRANSLATIONS[locale];
  const raw = dict[key] ?? enTranslations[key];
  if (!vars) return raw;
  return interpolate(raw, vars);
}
