import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { hashUserId, sanitizePath } from './analytics';

const feature = await loadFeature('./analytics.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('sanitizePath strips a single numeric segment', ({ Given, When, Then }) => {
    let path: string;
    let result: string;

    Given('a path "/rivals/12345"', () => {
      path = '/rivals/12345';
    });
    When('sanitizePath is called', () => {
      result = sanitizePath(path);
    });
    Then('the result is "/rivals/:id"', () => {
      expect(result).toBe('/rivals/:id');
    });
  });

  Scenario('sanitizePath strips multiple numeric segments', ({ Given, When, Then }) => {
    let path: string;
    let result: string;

    Given('a path "/h2h/99/vs/101"', () => {
      path = '/h2h/99/vs/101';
    });
    When('sanitizePath is called', () => {
      result = sanitizePath(path);
    });
    Then('the result is "/h2h/:id/vs/:id"', () => {
      expect(result).toBe('/h2h/:id/vs/:id');
    });
  });

  Scenario('sanitizePath leaves non-numeric segments unchanged', ({ Given, When, Then }) => {
    let path: string;
    let result: string;

    Given('a path "/leagues/top"', () => {
      path = '/leagues/top';
    });
    When('sanitizePath is called', () => {
      result = sanitizePath(path);
    });
    Then('the result is "/leagues/top"', () => {
      expect(result).toBe('/leagues/top');
    });
  });

  Scenario('hashUserId is deterministic', async ({ Given, When, Then }) => {
    let salt: string;
    let userId: string;
    let resultA: string;
    let resultB: string;

    Given('salt "test-salt" and user ID "550e8400-e29b-41d4-a716-446655440000"', () => {
      salt = 'test-salt';
      userId = '550e8400-e29b-41d4-a716-446655440000';
    });
    When('hashUserId is called twice with the same inputs', async () => {
      resultA = await hashUserId(salt, userId);
      resultB = await hashUserId(salt, userId);
    });
    Then('both results are identical', () => {
      expect(resultA).toBe(resultB);
    });
  });

  Scenario(
    'hashUserId does not expose raw user ID fragments',
    async ({ Given, When, Then, And }) => {
      let salt: string;
      let userId: string;
      let result: string;

      Given('salt "test-salt" and user ID "550e8400-e29b-41d4-a716-446655440000"', () => {
        salt = 'test-salt';
        userId = '550e8400-e29b-41d4-a716-446655440000';
      });
      When('hashUserId is called', async () => {
        result = await hashUserId(salt, userId);
      });
      Then('the result does not contain "550e8400"', () => {
        expect(result).not.toContain('550e8400');
      });
      And('the result does not contain "446655440000"', () => {
        expect(result).not.toContain('446655440000');
      });
    }
  );
});
