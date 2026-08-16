import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { theme as themeFeature } from '@simplyfpl/features';
import { isSupportedLocale } from '@simplyfpl/i18n';

const { DEFAULT_THEME, THEME_STORAGE_KEY, readStoredTheme, writeStoredTheme } = themeFeature;

interface FakeStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function makeFakeStore(initial?: Record<string, string>): FakeStore {
  const map = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

const feature = await loadFeature('./profile-settings.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Stored theme is read back correctly', ({ Given, When, Then }) => {
    let store: FakeStore;
    let resolved: string;

    Given('a theme store containing "bold"', () => {
      store = makeFakeStore({ [THEME_STORAGE_KEY]: 'bold' });
    });

    When('the stored theme is read', () => {
      resolved = readStoredTheme(store);
    });

    Then('the resolved theme is "bold"', () => {
      expect(resolved).toBe('bold');
    });
  });

  Scenario('Unknown stored value falls back to the default theme', ({ Given, When, Then }) => {
    let store: FakeStore;
    let resolved: string;

    Given('a theme store containing "neon"', () => {
      store = makeFakeStore({ [THEME_STORAGE_KEY]: 'neon' });
    });

    When('the stored theme is read', () => {
      resolved = readStoredTheme(store);
    });

    Then('the resolved theme is "stadium"', () => {
      expect(resolved).toBe(DEFAULT_THEME);
    });
  });

  Scenario('No stored theme falls back to the default', ({ Given, When, Then }) => {
    let store: FakeStore;
    let resolved: string;

    Given('a fresh theme store', () => {
      store = makeFakeStore();
    });

    When('the stored theme is read', () => {
      resolved = readStoredTheme(store);
    });

    Then('the resolved theme is "stadium"', () => {
      expect(resolved).toBe(DEFAULT_THEME);
    });
  });

  Scenario('Writing a theme persists it in the store', ({ Given, When, Then }) => {
    let store: FakeStore;

    Given('a fresh theme store', () => {
      store = makeFakeStore();
    });

    When('the user writes the theme "quiet"', () => {
      writeStoredTheme(store, 'quiet');
    });

    Then('the store contains "quiet"', () => {
      expect(store.getItem(THEME_STORAGE_KEY)).toBe('quiet');
    });
  });

  Scenario('Valid locale code is recognised', ({ Given, When, Then }) => {
    let code: string;
    let result: boolean;

    Given('the locale code "fr"', () => {
      code = 'fr';
    });

    When('the code is checked for support', () => {
      result = isSupportedLocale(code);
    });

    Then('it is a supported locale', () => {
      expect(result).toBe(true);
    });
  });

  Scenario('Unknown locale code is rejected', ({ Given, When, Then }) => {
    let code: string;
    let result: boolean;

    Given('the locale code "xx"', () => {
      code = 'xx';
    });

    When('the code is checked for support', () => {
      result = isSupportedLocale(code);
    });

    Then('it is not a supported locale', () => {
      expect(result).toBe(false);
    });
  });
});
