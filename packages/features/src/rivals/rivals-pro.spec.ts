import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { Tier } from '@simplyfpl/types';

import { getMaxTrackedLeagues } from '../leagues/tier-limits';

const feature = await loadFeature('./rivals-pro.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Free user is limited to one tracked league', ({ Given, When, Then }) => {
    let tier: Tier;
    let limit: number;

    Given('a user on the free tier', () => {
      tier = 'free';
    });

    When('I check the maximum number of leagues they can track', () => {
      limit = getMaxTrackedLeagues(tier);
    });

    Then('the limit should be 1', () => {
      expect(limit).toBe(1);
    });
  });

  Scenario('Pro user can track multiple leagues', ({ Given, When, Then }) => {
    let tier: Tier;
    let limit: number;

    Given('a user on the pro tier', () => {
      tier = 'pro';
    });

    When('I check the maximum number of leagues they can track', () => {
      limit = getMaxTrackedLeagues(tier);
    });

    Then('the limit should be greater than 1', () => {
      expect(limit).toBeGreaterThan(1);
    });
  });

  Scenario('Ultimate user can track multiple leagues', ({ Given, When, Then }) => {
    let tier: Tier;
    let limit: number;

    Given('a user on the ultimate tier', () => {
      tier = 'ultimate';
    });

    When('I check the maximum number of leagues they can track', () => {
      limit = getMaxTrackedLeagues(tier);
    });

    Then('the limit should be greater than 1', () => {
      expect(limit).toBeGreaterThan(1);
    });
  });
});
