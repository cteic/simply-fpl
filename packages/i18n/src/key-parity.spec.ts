import { describe, expect, it } from 'vitest';

import deTranslations from './locales/de.json';
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import frTranslations from './locales/fr.json';

const EN_KEYS = new Set(Object.keys(enTranslations));

const LOCALES: Array<{ code: string; translations: Record<string, string> }> = [
  { code: 'fr', translations: frTranslations },
  { code: 'de', translations: deTranslations },
  { code: 'es', translations: esTranslations },
];

describe('locale key parity', () => {
  for (const { code, translations } of LOCALES) {
    const localeKeys = new Set(Object.keys(translations));

    it(`${code}.json has no extra keys not present in en.json`, () => {
      const extra = [...localeKeys].filter((k) => !EN_KEYS.has(k));
      expect(extra, `Extra keys in ${code}.json: ${extra.join(', ')}`).toHaveLength(0);
    });

    it(`${code}.json has all keys from en.json`, () => {
      const missing = [...EN_KEYS].filter((k) => !localeKeys.has(k));
      expect(missing, `Missing keys in ${code}.json: ${missing.join(', ')}`).toHaveLength(0);
    });
  }
});
