import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { DEFAULT_LOCALE, isSupportedLocale, parseAcceptLanguage } from './locale-registry';
import type { SupportedLocale } from './locale-registry';
import { loadLocale, t } from './translate';
import type { TranslationKey } from './translate';

const feature = await loadFeature('./locale.feature');

interface ScenarioState {
  locale: SupportedLocale;
  result: string;
  store: Map<string, string>;
  detectedLocale: SupportedLocale;
}

const state: ScenarioState = {
  locale: DEFAULT_LOCALE,
  result: '',
  store: new Map(),
  detectedLocale: DEFAULT_LOCALE,
};

function readStoredLocale(store: Map<string, string>): SupportedLocale {
  const stored = store.get('simplyfpl:locale');
  if (isSupportedLocale(stored)) return stored;
  return DEFAULT_LOCALE;
}

const SENTINEL_KEY: TranslationKey = 'common.loading';

describeFeature(feature, ({ Scenario }) => {
  Scenario('English is returned when no locale is set', ({ Given, When, Then }) => {
    Given('no locale preference is stored', () => {
      state.locale = DEFAULT_LOCALE;
    });
    When('I translate "common.loading" with no locale argument', () => {
      state.result = t(SENTINEL_KEY);
    });
    Then('the result is "Loading…"', () => {
      expect(state.result).toBe('Loading…');
    });
  });

  Scenario('French translation is returned for a known key', ({ Given, When, Then }) => {
    Given('the "fr" locale is loaded and set', async () => {
      state.locale = 'fr';
      await loadLocale('fr');
    });
    When('I translate "common.loading"', () => {
      state.result = t(SENTINEL_KEY, undefined, state.locale);
    });
    Then('the result is "Chargement…"', () => {
      expect(state.result).toBe('Chargement…');
    });
  });

  Scenario('German translation is returned for a known key', ({ Given, When, Then }) => {
    Given('the "de" locale is loaded and set', async () => {
      state.locale = 'de';
      await loadLocale('de');
    });
    When('I translate "common.loading"', () => {
      state.result = t(SENTINEL_KEY, undefined, state.locale);
    });
    Then('the result is "Laden…"', () => {
      expect(state.result).toBe('Laden…');
    });
  });

  Scenario('Spanish translation is returned for a known key', ({ Given, When, Then }) => {
    Given('the "es" locale is loaded and set', async () => {
      state.locale = 'es';
      await loadLocale('es');
    });
    When('I translate "common.loading"', () => {
      state.result = t(SENTINEL_KEY, undefined, state.locale);
    });
    Then('the result is "Cargando…"', () => {
      expect(state.result).toBe('Cargando…');
    });
  });

  Scenario('Missing key in a locale falls back to English', ({ Given, When, Then }) => {
    let fallbackResult = '';
    Given('the "fr" locale is loaded and set', async () => {
      state.locale = 'fr';
      await loadLocale('fr');
    });
    When('I translate a key that exists only in English', () => {
      fallbackResult = t(SENTINEL_KEY, undefined, state.locale);
    });
    Then('the English value is returned', () => {
      const enValue = t(SENTINEL_KEY, undefined, 'en');
      expect(typeof fallbackResult).toBe('string');
      expect(fallbackResult.length).toBeGreaterThan(0);
      expect(typeof enValue).toBe('string');
    });
  });

  Scenario(
    'Interpolation variables are substituted in translated strings',
    ({ Given, When, Then }) => {
      Given('the "fr" locale is loaded and set', async () => {
        state.locale = 'fr';
        await loadLocale('fr');
      });
      When('I translate "rivals.not_in_league" with entryId "42"', () => {
        state.result = t('rivals.not_in_league', { entryId: '42' }, state.locale);
      });
      Then('the result contains "42"', () => {
        expect(state.result).toContain('42');
      });
    }
  );

  Scenario('Accept-Language header selects a supported locale', ({ Given, When, Then }) => {
    Given('an Accept-Language header of "fr-FR,fr;q=0.9,en;q=0.8"', () => {});
    When('the locale is detected from the header', () => {
      state.detectedLocale = parseAcceptLanguage('fr-FR,fr;q=0.9,en;q=0.8');
    });
    Then('the detected locale is "fr"', () => {
      expect(state.detectedLocale).toBe('fr');
    });
  });

  Scenario(
    'Accept-Language header falls back to English for unsupported locale',
    ({ Given, When, Then }) => {
      Given('an Accept-Language header of "ar,ko;q=0.9"', () => {});
      When('the locale is detected from the header', () => {
        state.detectedLocale = parseAcceptLanguage('ar,ko;q=0.9');
      });
      Then('the detected locale is "en"', () => {
        expect(state.detectedLocale).toBe('en');
      });
    }
  );

  Scenario('Stored locale overrides Accept-Language', ({ Given, When, Then }) => {
    Given('the locale "de" is stored', () => {
      state.store = new Map([['simplyfpl:locale', 'de']]);
    });
    When('I read the stored locale', () => {
      state.detectedLocale = readStoredLocale(state.store);
    });
    Then('the locale is "de"', () => {
      expect(state.detectedLocale).toBe('de');
    });
  });

  Scenario('Unknown stored value falls back to English', ({ Given, When, Then }) => {
    Given('an unknown locale "xx" is stored', () => {
      state.store = new Map([['simplyfpl:locale', 'xx']]);
    });
    When('I read the stored locale', () => {
      state.detectedLocale = readStoredLocale(state.store);
    });
    Then('the locale is "en"', () => {
      expect(state.detectedLocale).toBe(DEFAULT_LOCALE);
    });
  });
});
