import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { type FplPassthroughTarget, buildFplPassthroughTarget } from './passthrough';

const feature = await loadFeature('./passthrough.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'paginated league standings hit upstream with the requested page',
    ({ Given, When, Then, And }) => {
      let fplOrigin = '';
      let target: FplPassthroughTarget | null = null;

      Given('the FPL origin is "https://fantasy.premierleague.com/api"', () => {
        fplOrigin = 'https://fantasy.premierleague.com/api';
      });

      When(
        'the worker builds a passthrough target for path "/leagues-classic/314/standings/" and search "?page_standings=5"',
        () => {
          target = buildFplPassthroughTarget(
            fplOrigin,
            '/leagues-classic/314/standings/',
            '?page_standings=5'
          );
        }
      );

      Then(
        'the upstream URL is "https://fantasy.premierleague.com/api/leagues-classic/314/standings/?page_standings=5"',
        () => {
          expect(target?.upstreamUrl).toBe(
            'https://fantasy.premierleague.com/api/leagues-classic/314/standings/?page_standings=5'
          );
        }
      );

      And('the cache key is "fpl:/leagues-classic/314/standings/?page_standings=5"', () => {
        expect(target?.cacheKey).toBe('fpl:/leagues-classic/314/standings/?page_standings=5');
      });
    }
  );

  Scenario('different query strings get different cache keys', ({ Given, When, Then }) => {
    let fplOrigin = '';
    let page1: FplPassthroughTarget | null = null;
    let page5: FplPassthroughTarget | null = null;

    Given('the FPL origin is "https://fantasy.premierleague.com/api"', () => {
      fplOrigin = 'https://fantasy.premierleague.com/api';
    });

    When(
      'the worker builds passthrough targets for "/leagues-classic/314/standings/" with searches "?page_standings=1" and "?page_standings=5"',
      () => {
        page1 = buildFplPassthroughTarget(
          fplOrigin,
          '/leagues-classic/314/standings/',
          '?page_standings=1'
        );
        page5 = buildFplPassthroughTarget(
          fplOrigin,
          '/leagues-classic/314/standings/',
          '?page_standings=5'
        );
      }
    );

    Then('the two cache keys are different', () => {
      expect(page1?.cacheKey).not.toBe(page5?.cacheKey);
    });
  });

  Scenario('requests without a query string still work', ({ Given, When, Then, And }) => {
    let fplOrigin = '';
    let target: FplPassthroughTarget | null = null;

    Given('the FPL origin is "https://fantasy.premierleague.com/api"', () => {
      fplOrigin = 'https://fantasy.premierleague.com/api';
    });

    When(
      'the worker builds a passthrough target for path "/bootstrap-static/" and search ""',
      () => {
        target = buildFplPassthroughTarget(fplOrigin, '/bootstrap-static/', '');
      }
    );

    Then('the upstream URL is "https://fantasy.premierleague.com/api/bootstrap-static/"', () => {
      expect(target?.upstreamUrl).toBe('https://fantasy.premierleague.com/api/bootstrap-static/');
    });

    And('the cache key is "fpl:/bootstrap-static/"', () => {
      expect(target?.cacheKey).toBe('fpl:/bootstrap-static/');
    });
  });
});
