import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { ThemeName, ThemeStore } from './theme';
import { DEFAULT_THEME, THEME_STORAGE_KEY, readStoredTheme, writeStoredTheme } from './theme';

const feature = await loadFeature('./theme.feature');

function createFakeStore(initial?: Record<string, string>): ThemeStore {
  const map = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    getItem: (key) => (map.has(key) ? (map.get(key) ?? null) : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

const scenarioState: { store: ThemeStore; resolved: ThemeName } = {
  store: createFakeStore(),
  resolved: DEFAULT_THEME,
};

describeFeature(feature, ({ Scenario }) => {
  Scenario('Switching theme persists the choice across reloads', ({ Given, When, Then }) => {
    Given('a fresh theme store', () => {
      scenarioState.store = createFakeStore();
    });
    When('the user selects the "bold" theme', () => {
      writeStoredTheme(scenarioState.store, 'bold');
    });
    Then('a reload reads back the "bold" theme', () => {
      expect(readStoredTheme(scenarioState.store)).toBe('bold');
    });
  });

  Scenario('An unknown stored value falls back to Stadium', ({ Given, When, Then }) => {
    Given('a theme store containing the value "neon"', () => {
      scenarioState.store = createFakeStore({ [THEME_STORAGE_KEY]: 'neon' });
    });
    When('the persisted theme is read', () => {
      scenarioState.resolved = readStoredTheme(scenarioState.store);
    });
    Then('the resolved theme is "stadium"', () => {
      expect(scenarioState.resolved).toBe(DEFAULT_THEME);
    });
  });

  Scenario('With no stored preference the default is Stadium', ({ Given, When, Then }) => {
    Given('a fresh theme store', () => {
      scenarioState.store = createFakeStore();
    });
    When('the persisted theme is read', () => {
      scenarioState.resolved = readStoredTheme(scenarioState.store);
    });
    Then('the resolved theme is "stadium"', () => {
      expect(scenarioState.resolved).toBe(DEFAULT_THEME);
    });
  });
});
