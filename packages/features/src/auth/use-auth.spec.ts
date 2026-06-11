import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { computeIsPro } from './use-auth';

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
});
