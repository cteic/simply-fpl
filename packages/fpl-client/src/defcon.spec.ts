import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { DefConProgress } from '@simplyfpl/types';

import { computeDefConProgress } from './defcon';

const feature = await loadFeature('./defcon.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('DEF with CBIT below threshold shows in-progress bar', ({ Given, When, Then, And }) => {
    let result: DefConProgress;

    Given('a defender with 8 clearances-blocks-interceptions and 0 tackles', () => {});

    When('I compute DefCon progress', () => {
      result = computeDefConProgress(2, { clearances_blocks_interceptions: 8, tackles: 0 });
    });

    Then('the progress is eligible', () => {
      expect(result.eligible).toBe(true);
    });

    And('the current is 8 and threshold is 10', () => {
      expect(result.current).toBe(8);
      expect(result.threshold).toBe(10);
    });

    And('the percentage is 80', () => {
      expect(result.percentage).toBe(80);
    });

    And('awarded is false', () => {
      expect(result.awarded).toBe(false);
    });
  });

  Scenario('DEF reaching the threshold is awarded', ({ Given, When, Then, And }) => {
    let result: DefConProgress;

    Given('a defender with 7 clearances-blocks-interceptions and 4 tackles', () => {});

    When('I compute DefCon progress', () => {
      result = computeDefConProgress(2, { clearances_blocks_interceptions: 7, tackles: 4 });
    });

    Then('the progress is eligible', () => {
      expect(result.eligible).toBe(true);
    });

    And('the current is 11 and threshold is 10', () => {
      expect(result.current).toBe(11);
      expect(result.threshold).toBe(10);
    });

    And('the percentage is 100', () => {
      expect(result.percentage).toBe(100);
    });

    And('awarded is true', () => {
      expect(result.awarded).toBe(true);
    });
  });

  Scenario('MID has a higher threshold of 12', ({ Given, When, Then, And }) => {
    let result: DefConProgress;

    Given('a midfielder with 10 clearances-blocks-interceptions and 1 tackle', () => {});

    When('I compute DefCon progress', () => {
      result = computeDefConProgress(3, { clearances_blocks_interceptions: 10, tackles: 1 });
    });

    Then('the progress is eligible', () => {
      expect(result.eligible).toBe(true);
    });

    And('the current is 11 and threshold is 12', () => {
      expect(result.current).toBe(11);
      expect(result.threshold).toBe(12);
    });

    And('awarded is false', () => {
      expect(result.awarded).toBe(false);
    });
  });

  Scenario('GK is not eligible for DefCon', ({ Given, When, Then }) => {
    let result: DefConProgress;

    Given('a goalkeeper with 5 clearances-blocks-interceptions and 2 tackles', () => {});

    When('I compute DefCon progress', () => {
      result = computeDefConProgress(1, { clearances_blocks_interceptions: 5, tackles: 2 });
    });

    Then('the progress is not eligible', () => {
      expect(result.eligible).toBe(false);
    });
  });

  Scenario('FWD is not eligible for DefCon', ({ Given, When, Then }) => {
    let result: DefConProgress;

    Given('a forward with 3 clearances-blocks-interceptions and 5 tackles', () => {});

    When('I compute DefCon progress', () => {
      result = computeDefConProgress(4, { clearances_blocks_interceptions: 3, tackles: 5 });
    });

    Then('the progress is not eligible', () => {
      expect(result.eligible).toBe(false);
    });
  });

  Scenario('CBIT not yet logged returns zero progress', ({ Given, When, Then, And }) => {
    let result: DefConProgress;

    Given('a defender with 0 clearances-blocks-interceptions and 0 tackles', () => {});

    When('I compute DefCon progress', () => {
      result = computeDefConProgress(2, { clearances_blocks_interceptions: 0, tackles: 0 });
    });

    Then('the progress is eligible', () => {
      expect(result.eligible).toBe(true);
    });

    And('the current is 0 and threshold is 10', () => {
      expect(result.current).toBe(0);
      expect(result.threshold).toBe(10);
    });

    And('the percentage is 0', () => {
      expect(result.percentage).toBe(0);
    });

    And('awarded is false', () => {
      expect(result.awarded).toBe(false);
    });
  });
});
