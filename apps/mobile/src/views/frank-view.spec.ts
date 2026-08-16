import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { frank } from '@simplyfpl/features';
import type { FrankAccess } from '@simplyfpl/features/frank';
import type { Tier } from '@simplyfpl/types';

const { resolveFrankAccess, isFrankWeeklyPayload } = frank;

const feature = await loadFeature('./frank-view.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Free-tier user cannot access weekly advice', ({ Given, When, Then, And }) => {
    let access: FrankAccess;

    Given('a user on the "free" tier', () => {});

    When('Frank access is resolved', () => {
      access = resolveFrankAccess('free' as Tier);
    });

    Then('on-demand questions are not available', () => {
      expect(access.canAskOnDemand).toBe(false);
    });

    And('the upgrade tier is "ultimate"', () => {
      expect(access.upgradeTo).toBe('ultimate');
    });
  });

  Scenario('Pro-tier user receives weekly-cache advice', ({ Given, When, Then, And }) => {
    let access: FrankAccess;

    Given('a user on the "pro" tier', () => {});

    When('Frank access is resolved', () => {
      access = resolveFrankAccess('pro' as Tier);
    });

    Then('on-demand questions are not available', () => {
      expect(access.canAskOnDemand).toBe(false);
    });

    And('the weekly source is "weekly-cache"', () => {
      expect(access.source).toBe('weekly-cache');
    });
  });

  Scenario('Ultimate-tier user gets on-demand access', ({ Given, When, Then }) => {
    let access: FrankAccess;

    Given('a user on the "ultimate" tier', () => {});

    When('Frank access is resolved', () => {
      access = resolveFrankAccess('ultimate' as Tier);
    });

    Then('on-demand questions are available', () => {
      expect(access.canAskOnDemand).toBe(true);
    });
  });

  Scenario('Weekly payload shape is validated', ({ Given, When, Then }) => {
    let payload: unknown;
    let result: boolean;

    Given('a valid frank weekly payload', () => {
      payload = {
        gameweek: 30,
        generatedAt: '2026-03-01T00:00:00Z',
        captainCandidates: [{ name: 'Salah', team: 'LIV', reason: 'Home fixture.' }],
        transferTargets: [{ name: 'Haaland', team: 'MCI', reason: 'Good form.' }],
      };
    });

    When('the payload is validated', () => {
      result = isFrankWeeklyPayload(payload);
    });

    Then('it is accepted as a FrankWeeklyPayload', () => {
      expect(result).toBe(true);
    });
  });

  Scenario('Invalid shape is rejected', ({ Given, When, Then }) => {
    let payload: unknown;
    let result: boolean;

    Given('an object missing required frank fields', () => {
      payload = { foo: 'bar' };
    });

    When('the payload is validated', () => {
      result = isFrankWeeklyPayload(payload);
    });

    Then('it is rejected', () => {
      expect(result).toBe(false);
    });
  });
});
