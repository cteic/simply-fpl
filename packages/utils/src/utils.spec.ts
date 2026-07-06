import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { clamp, formatRank, formatRankMovement, isLiveGameweek } from './index';

const feature = await loadFeature('./utils.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Format rank 1 as 1st', ({ Given, When, Then }) => {
    let rank: number;
    let result: string;

    Given('a rank value of 1', () => {
      rank = 1;
    });
    When('I format the rank', () => {
      result = formatRank(rank);
    });
    Then('the result should be 1st', () => {
      expect(result).toBe('1st');
    });
  });

  Scenario('Format rank 11 as 11th', ({ Given, When, Then }) => {
    let rank: number;
    let result: string;

    Given('a rank value of 11', () => {
      rank = 11;
    });
    When('I format the rank', () => {
      result = formatRank(rank);
    });
    Then('the result should be 11th', () => {
      expect(result).toBe('11th');
    });
  });

  Scenario('Format rank 22 as 22nd', ({ Given, When, Then }) => {
    let rank: number;
    let result: string;

    Given('a rank value of 22', () => {
      rank = 22;
    });
    When('I format the rank', () => {
      result = formatRank(rank);
    });
    Then('the result should be 22nd', () => {
      expect(result).toBe('22nd');
    });
  });

  Scenario('Format zero or negative rank as a dash', ({ Given, When, Then }) => {
    let rank: number;
    let result: string;

    Given('a rank value of 0', () => {
      rank = 0;
    });
    When('I format the rank', () => {
      result = formatRank(rank);
    });
    Then('the result should be —', () => {
      expect(result).toBe('—');
    });
  });

  Scenario('Format positive rank movement with up arrow', ({ Given, When, Then }) => {
    let movement: number;
    let result: string;

    Given('a rank movement of 500', () => {
      movement = 500;
    });
    When('I format the rank movement', () => {
      result = formatRankMovement(movement);
    });
    Then('the result should start with an up arrow', () => {
      expect(result).toMatch(/^↑/);
    });
  });

  Scenario('Format negative rank movement with down arrow', ({ Given, When, Then }) => {
    let movement: number;
    let result: string;

    Given('a rank movement of -300', () => {
      movement = -300;
    });
    When('I format the rank movement', () => {
      result = formatRankMovement(movement);
    });
    Then('the result should start with a down arrow', () => {
      expect(result).toMatch(/^↓/);
    });
  });

  Scenario('Format zero rank movement as a dash', ({ Given, When, Then }) => {
    let movement: number;
    let result: string;

    Given('a rank movement of 0', () => {
      movement = 0;
    });
    When('I format the rank movement', () => {
      result = formatRankMovement(movement);
    });
    Then('the result should be —', () => {
      expect(result).toBe('—');
    });
  });

  Scenario(
    'isLiveGameweek returns true for current unfinished gameweek',
    ({ Given, When, Then }) => {
      let event: { is_current: boolean; finished: boolean };
      let result: boolean;

      Given('a gameweek that is current and not finished', () => {
        event = { is_current: true, finished: false };
      });
      When('I check if it is a live gameweek', () => {
        result = isLiveGameweek(event);
      });
      Then('the result should be true', () => {
        expect(result).toBe(true);
      });
    }
  );

  Scenario('isLiveGameweek returns false for finished gameweek', ({ Given, When, Then }) => {
    let event: { is_current: boolean; finished: boolean };
    let result: boolean;

    Given('a gameweek that is current and finished', () => {
      event = { is_current: true, finished: true };
    });
    When('I check if it is a live gameweek', () => {
      result = isLiveGameweek(event);
    });
    Then('the result should be false', () => {
      expect(result).toBe(false);
    });
  });

  Scenario('Clamp keeps value within bounds', ({ Given, When, Then }) => {
    let value: number;
    let result: number;

    Given('a value of 150 with min 0 and max 100', () => {
      value = 150;
    });
    When('I clamp the value', () => {
      result = clamp(value, 0, 100);
    });
    Then('the result should be 100', () => {
      expect(result).toBe(100);
    });
  });
});
