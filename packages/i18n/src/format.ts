import type { SupportedLocale } from './locale-registry';

const INTL_LOCALE: Record<SupportedLocale, string> = {
  en: 'en-GB',
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES',
};

export function formatNumber(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale]).format(value);
}

export function formatOrdinal(value: number, locale: SupportedLocale): string {
  const fmt = new Intl.PluralRules(INTL_LOCALE[locale], { type: 'ordinal' });
  const rule = fmt.select(value);
  const suffixes: Record<string, Record<string, string>> = {
    'en-GB': { one: 'st', two: 'nd', few: 'rd', other: 'th' },
    'fr-FR': { one: 'er', other: 'e' },
    'de-DE': { other: '.' },
    'es-ES': { other: '.º' },
  };
  const suffix = suffixes[INTL_LOCALE[locale]]?.[rule] ?? '';
  return `${value}${suffix}`;
}

export function formatDate(
  date: Date,
  locale: SupportedLocale,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], options).format(date);
}

export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale: SupportedLocale
): string {
  return new Intl.RelativeTimeFormat(INTL_LOCALE[locale], { numeric: 'auto' }).format(value, unit);
}
