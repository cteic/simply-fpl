import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { parseEntryId } from './parse-entry-id';

const feature = await loadFeature('./parse-entry-id.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Bare numeric team id', ({ Given, When, Then }) => {
    let input: string;
    let result: number | null;
    Given('the input "1234567"', () => {
      input = '1234567';
    });
    When('I parse the entry id', () => {
      result = parseEntryId(input);
    });
    Then('the result should be 1234567', () => {
      expect(result).toBe(1234567);
    });
  });

  Scenario('Pasted FPL team URL', ({ Given, When, Then }) => {
    let input: string;
    let result: number | null;
    Given('the input "https://fantasy.premierleague.com/entry/987654/event/30"', () => {
      input = 'https://fantasy.premierleague.com/entry/987654/event/30';
    });
    When('I parse the entry id', () => {
      result = parseEntryId(input);
    });
    Then('the result should be 987654', () => {
      expect(result).toBe(987654);
    });
  });

  Scenario('Input with surrounding whitespace', ({ Given, When, Then }) => {
    let input: string;
    let result: number | null;
    Given('the input "  42  "', () => {
      input = '  42  ';
    });
    When('I parse the entry id', () => {
      result = parseEntryId(input);
    });
    Then('the result should be 42', () => {
      expect(result).toBe(42);
    });
  });

  Scenario('Non-numeric rubbish', ({ Given, When, Then }) => {
    let input: string;
    let result: number | null;
    Given('the input "not-a-team"', () => {
      input = 'not-a-team';
    });
    When('I parse the entry id', () => {
      result = parseEntryId(input);
    });
    Then('the result should be null', () => {
      expect(result).toBeNull();
    });
  });

  Scenario('Zero is rejected', ({ Given, When, Then }) => {
    let input: string;
    let result: number | null;
    Given('the input "0"', () => {
      input = '0';
    });
    When('I parse the entry id', () => {
      result = parseEntryId(input);
    });
    Then('the result should be null', () => {
      expect(result).toBeNull();
    });
  });

  Scenario('Empty input', ({ Given, When, Then }) => {
    let input: string;
    let result: number | null;
    Given('the input ""', () => {
      input = '';
    });
    When('I parse the entry id', () => {
      result = parseEntryId(input);
    });
    Then('the result should be null', () => {
      expect(result).toBeNull();
    });
  });
});
