import { DEFAULT_LOCALE, parseAcceptLanguage } from '@simplyfpl/i18n';
import type { SupportedLocale } from '@simplyfpl/i18n';

export async function detectServerLocale(): Promise<SupportedLocale> {
  try {
    const { headers } = await import('next/headers');
    const headersList = await headers();
    return parseAcceptLanguage(headersList.get('accept-language'));
  } catch {
    return DEFAULT_LOCALE;
  }
}
