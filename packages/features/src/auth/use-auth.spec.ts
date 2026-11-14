import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import {
  clearLocalEntryId,
  computeIsPro,
  readLocalEntryId,
  shouldClearEntryIdOnSessionChange,
} from './use-auth';

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

function throwingStorage() {
  const fail = (): never => {
    throw new Error('SecurityError');
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

const feature = await loadFeature('./use-auth.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Active Pro with no expiry is recognised as Pro', ({ Given, When, Then }) => {
    let profile: { is_pro: boolean; pro_until: string | null };
    let result: boolean;

    Given('a profile with is_pro true and no pro_until date', () => {
      profile = { is_pro: true, pro_until: null };
    });

    When('I compute the Pro status', () => {
      result = computeIsPro(profile);
    });

    Then('the result should be Pro', () => {
      expect(result).toBe(true);
    });
  });

  Scenario('Active Pro within expiry window is recognised as Pro', ({ Given, When, Then }) => {
    let profile: { is_pro: boolean; pro_until: string | null };
    let result: boolean;

    Given('a profile with is_pro true and pro_until set to a future date', () => {
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      profile = { is_pro: true, pro_until: future };
    });

    When('I compute the Pro status', () => {
      result = computeIsPro(profile);
    });

    Then('the result should be Pro', () => {
      expect(result).toBe(true);
    });
  });

  Scenario('Expired Pro subscription is not recognised as Pro', ({ Given, When, Then }) => {
    let profile: { is_pro: boolean; pro_until: string | null };
    let result: boolean;

    Given('a profile with is_pro true and pro_until set to a past date', () => {
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      profile = { is_pro: true, pro_until: past };
    });

    When('I compute the Pro status', () => {
      result = computeIsPro(profile);
    });

    Then('the result should not be Pro', () => {
      expect(result).toBe(false);
    });
  });

  Scenario('Free user is never recognised as Pro', ({ Given, When, Then }) => {
    let profile: { is_pro: boolean; pro_until: string | null };
    let result: boolean;

    Given('a profile with is_pro false and no pro_until date', () => {
      profile = { is_pro: false, pro_until: null };
    });

    When('I compute the Pro status', () => {
      result = computeIsPro(profile);
    });

    Then('the result should not be Pro', () => {
      expect(result).toBe(false);
    });
  });

  Scenario(
    'Signing out clears the saved team so the next account does not inherit it',
    ({ Given, When, Then }) => {
      const storage = memoryStorage();

      Given('a saved team 123 on this device for a signed-in user', () => {
        storage.setItem('simplyfpl:lastEntryId', '123');
      });

      When('that user signs out', () => {
        if (shouldClearEntryIdOnSessionChange('user-a', null)) clearLocalEntryId(storage);
      });

      Then('the saved team is cleared', () => {
        expect(readLocalEntryId(storage)).toBeNull();
        expect(shouldClearEntryIdOnSessionChange(null, 'user-b')).toBe(false);
        expect(shouldClearEntryIdOnSessionChange('user-a', 'user-a')).toBe(false);
      });
    }
  );

  Scenario('Blocked storage does not break the saved team helpers', ({ Given, When, Then }) => {
    let storage: ReturnType<typeof throwingStorage>;
    let read: number | null = 0;

    Given('storage that throws on every access', () => {
      storage = throwingStorage();
    });

    When('the saved team is read and cleared', () => {
      read = readLocalEntryId(storage);
      clearLocalEntryId(storage);
    });

    Then('no error escapes and no team is returned', () => {
      expect(read).toBeNull();
    });
  });
});
