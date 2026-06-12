import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { Tier } from '@simplyfpl/types';

import type { TrackedLeague } from '../leagues';
import { isPro } from '../subscriptions';
import { getVisibleLeagues } from './multi-league';

const feature = await loadFeature('./multi-league.feature');

function makeLeagues(count: number): TrackedLeague[] {
  return Array.from({ length: count }, (_, i) => ({ league_id: 100 + i, position: i }));
}

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'Free user with 2 tracked leagues sees only the primary league',
    ({ Given, When, Then, And }) => {
      let tier: Tier;
      let leagues: TrackedLeague[];
      let visible: TrackedLeague[];

      Given('a free user', () => {
        tier = 'free';
      });

      And('the user has 2 tracked leagues', () => {
        leagues = makeLeagues(2);
      });

      When('I get the visible leagues', () => {
        visible = getVisibleLeagues(leagues, isPro(tier));
      });

      Then('only 1 league should be visible', () => {
        expect(visible).toHaveLength(1);
      });

      And('it should be the primary league', () => {
        expect(visible[0]?.league_id).toBe(leagues[0]?.league_id);
      });
    }
  );

  Scenario('Pro user with 2 tracked leagues sees all leagues', ({ Given, When, Then, And }) => {
    let tier: Tier;
    let leagues: TrackedLeague[];
    let visible: TrackedLeague[];

    Given('a pro user', () => {
      tier = 'pro';
    });

    And('the user has 2 tracked leagues', () => {
      leagues = makeLeagues(2);
    });

    When('I get the visible leagues', () => {
      visible = getVisibleLeagues(leagues, isPro(tier));
    });

    Then('2 leagues should be visible', () => {
      expect(visible).toHaveLength(2);
    });
  });

  Scenario(
    'Ultimate user with 2 tracked leagues sees all leagues',
    ({ Given, When, Then, And }) => {
      let tier: Tier;
      let leagues: TrackedLeague[];
      let visible: TrackedLeague[];

      Given('an ultimate user', () => {
        tier = 'ultimate';
      });

      And('the user has 2 tracked leagues', () => {
        leagues = makeLeagues(2);
      });

      When('I get the visible leagues', () => {
        visible = getVisibleLeagues(leagues, isPro(tier));
      });

      Then('2 leagues should be visible', () => {
        expect(visible).toHaveLength(2);
      });
    }
  );

  Scenario('Free user with no tracked leagues sees no leagues', ({ Given, When, Then, And }) => {
    let tier: Tier;
    let leagues: TrackedLeague[];
    let visible: TrackedLeague[];

    Given('a free user', () => {
      tier = 'free';
    });

    And('the user has 0 tracked leagues', () => {
      leagues = makeLeagues(0);
    });

    When('I get the visible leagues', () => {
      visible = getVisibleLeagues(leagues, isPro(tier));
    });

    Then('0 leagues should be visible', () => {
      expect(visible).toHaveLength(0);
    });
  });
});
