import type { SupportedLocale } from './locale-registry';
import { DEFAULT_LOCALE } from './locale-registry';
import enTranslations from './locales/en.json';

export type TranslationKey = keyof typeof enTranslations;
type Vars = Record<string, string | number>;

type LocaleDict = Record<string, string>;

const loadedLocales: Partial<Record<SupportedLocale, LocaleDict>> = {
  en: enTranslations,
};

export function registerLocale(locale: SupportedLocale, dict: LocaleDict): void {
  loadedLocales[locale] = dict;
}

export function isLocaleLoaded(locale: SupportedLocale): boolean {
  return loadedLocales[locale] !== undefined;
}

export async function loadLocale(locale: SupportedLocale): Promise<void> {
  if (loadedLocales[locale]) return;
  if (locale === 'fr') {
    registerLocale('fr', (await import('./locales/fr.json')).default);
    return;
  }
  if (locale === 'de') {
    registerLocale('de', (await import('./locales/de.json')).default);
    return;
  }
  if (locale === 'es') {
    registerLocale('es', (await import('./locales/es.json')).default);
    return;
  }
  if (locale === 'ru') {
    registerLocale('ru', (await import('./locales/ru.json')).default);
    return;
  }
  if (locale === 'zh') {
    registerLocale('zh', (await import('./locales/zh.json')).default);
    return;
  }
  if (locale === 'ja') {
    registerLocale('ja', (await import('./locales/ja.json')).default);
  }
}

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
  const dict = loadedLocales[locale] ?? enTranslations;
  const raw = dict[key] ?? enTranslations[key];
  if (!vars) return raw;
  return interpolate(raw, vars);
}
