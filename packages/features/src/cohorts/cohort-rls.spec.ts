import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { type UserTier, canReadCohortTier } from './cohort-rls';
import type { CohortTier } from './types';

const feature = await loadFeature('./cohort-rls.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Free user may read top_10k cohort rows', ({ Given, When, Then }) => {
    let userTier: UserTier;
    let cohortTier: CohortTier;
    let result: boolean;

    Given("a signed-in user with tier 'free'", () => {
      userTier = 'free';
    });

    When("they request cohort data for tier 'top_10k'", () => {
      cohortTier = 'top_10k';
      result = canReadCohortTier(userTier, cohortTier);
    });

    Then('access is granted', () => {
      expect(result).toBe(true);
    });
  });

  Scenario("Free user is denied 'overall' cohort rows", ({ Given, When, Then }) => {
    let userTier: UserTier;
    let cohortTier: CohortTier;
    let result: boolean;

    Given("a signed-in user with tier 'free'", () => {
      userTier = 'free';
    });

    When("they request cohort data for tier 'overall'", () => {
      cohortTier = 'overall';
      result = canReadCohortTier(userTier, cohortTier);
    });

    Then('access is denied', () => {
      expect(result).toBe(false);
    });
  });

  Scenario("Pro user may read 'overall' cohort rows", ({ Given, When, Then }) => {
    let userTier: UserTier;
    let cohortTier: CohortTier;
    let result: boolean;

    Given("a signed-in user with tier 'pro'", () => {
      userTier = 'pro';
    });

    When("they request cohort data for tier 'overall'", () => {
      cohortTier = 'overall';
      result = canReadCohortTier(userTier, cohortTier);
    });

    Then('access is granted', () => {
      expect(result).toBe(true);
    });
  });

  Scenario("Ultimate user may read 'legendary' cohort rows", ({ Given, When, Then }) => {
    let userTier: UserTier;
    let cohortTier: CohortTier;
    let result: boolean;

    Given("a signed-in user with tier 'ultimate'", () => {
      userTier = 'ultimate';
    });

    When("they request cohort data for tier 'legendary'", () => {
      cohortTier = 'legendary';
      result = canReadCohortTier(userTier, cohortTier);
    });

    Then('access is granted', () => {
      expect(result).toBe(true);
    });
  });
});
