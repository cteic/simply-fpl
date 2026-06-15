import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import {
  DEFAULT_WINDOW_SIZE,
  type WindowSize,
  readWindowSize,
  windowSizeToSelectOptions,
  writeWindowSize,
} from './rivals-window';
import type { SelectRivalsOptions } from './select-rivals';

const feature = await loadFeature('./rivals-window.feature');

function makeLocalStorageMock(): { store: Record<string, string>; mock: Storage } {
  const store: Record<string, string> = {};
  const mock = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    key: (_i: number) => null,
    length: 0,
  } as unknown as Storage;
  return { store, mock };
}

function installLocalStorage(mock: Storage) {
  (globalThis as Record<string, unknown>).localStorage = mock;
}

function removeLocalStorage() {
  (globalThis as Record<string, unknown>).localStorage = undefined;
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Window size 5 maps to 2 above and 2 below', ({ Given, When, Then, And }) => {
    let size: WindowSize;
    let opts: SelectRivalsOptions;

    Given('a window size of 5', () => {
      size = 5;
    });

    When('I convert it to select options', () => {
      opts = windowSizeToSelectOptions(size);
    });

    Then('the above count should be 2', () => {
      expect(opts.above).toBe(2);
    });

    And('the below count should be 2', () => {
      expect(opts.below).toBe(2);
    });
  });

  Scenario('Window size 3 maps to 1 above and 1 below', ({ Given, When, Then, And }) => {
    let size: WindowSize;
    let opts: SelectRivalsOptions;

    Given('a window size of 3', () => {
      size = 3;
    });

    When('I convert it to select options', () => {
      opts = windowSizeToSelectOptions(size);
    });

    Then('the above count should be 1', () => {
      expect(opts.above).toBe(1);
    });

    And('the below count should be 1', () => {
      expect(opts.below).toBe(1);
    });
  });

  Scenario('Window size 10 maps to 4 above and 5 below', ({ Given, When, Then, And }) => {
    let size: WindowSize;
    let opts: SelectRivalsOptions;

    Given('a window size of 10', () => {
      size = 10;
    });

    When('I convert it to select options', () => {
      opts = windowSizeToSelectOptions(size);
    });

    Then('the above count should be 4', () => {
      expect(opts.above).toBe(4);
    });

    And('the below count should be 5', () => {
      expect(opts.below).toBe(5);
    });
  });

  Scenario('Reading an absent key returns the default window size', ({ Given, When, Then }) => {
    let result: WindowSize;
    const { mock } = makeLocalStorageMock();

    Given('no window size has been saved for user "u1"', () => {
      installLocalStorage(mock);
    });

    When('I read the window size for user "u1"', () => {
      result = readWindowSize('u1');
    });

    Then('the result should be 5', () => {
      removeLocalStorage();
      expect(result).toBe(DEFAULT_WINDOW_SIZE);
    });
  });

  Scenario('A saved window size is preserved on read', ({ Given, When, Then }) => {
    let result: WindowSize;
    const { mock } = makeLocalStorageMock();

    Given('a window size of 10 has been saved for user "u1"', () => {
      installLocalStorage(mock);
      writeWindowSize('u1', 10);
    });

    When('I read the window size for user "u1"', () => {
      result = readWindowSize('u1');
    });

    Then('the result should be 10', () => {
      removeLocalStorage();
      expect(result).toBe(10);
    });
  });
});
