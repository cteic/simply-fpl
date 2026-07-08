// FPL jargon glossary — these terms are kept in English across all locales:
//   gameweek / GW, Bench Boost, Triple Captain, Wildcard, Free Hit (chip names)
//   FPL, Premier League, Fantasy Premier League (proper nouns)
//   GW<n> shorthand (e.g. "GW30") — universally recognised in FPL communities
//
// Terms that get a fixed per-locale translation:
//   differential → fr: différentiel | de: Differenzialspieler | es: diferencial | ru: дифференциал | zh: 差异球员 | ja: 差別化選手
//   hit (transfer penalty) → fr: pénalité | de: Strafpunkt | es: penalización | ru: штрафное очко | zh: 扣分 | ja: ペナルティ
//   captain → fr: capitaine | de: Kapitän | es: capitán | ru: капитан | zh: 队长 | ja: キャプテン
//   bench → fr: remplaçants | de: Bank | es: suplentes | ru: скамейка | zh: 替补席 | ja: ベンチ
//   rank → fr: classement | de: Rang | es: clasificación | ru: рейтинг | zh: 排名 | ja: ランク

export const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'es', 'ru', 'zh', 'ja'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';
export const LOCALE_STORAGE_KEY = 'simplyfpl:locale';

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  ru: 'Русский',
  zh: '中文',
  ja: '日本語',
};

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return SUPPORTED_LOCALES.some((locale) => locale === value);
}

export function parseAcceptLanguage(header: string | null | undefined): SupportedLocale {
  if (!header) return DEFAULT_LOCALE;
  const tags = header
    .split(',')
    .map((s) => (s.split(';')[0] ?? s).trim().toLowerCase())
    .map((s) => s.split('-')[0] ?? s);
  const match = tags.find((tag) => isSupportedLocale(tag));
  return isSupportedLocale(match) ? match : DEFAULT_LOCALE;
}
