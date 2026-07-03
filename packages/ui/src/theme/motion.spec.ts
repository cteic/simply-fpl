import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { MOTION_DURATIONS, shouldPulse } from './motion';

const feature = await loadFeature('./src/theme/motion.feature');

interface PulseWorld {
  previousKey: string | number | null;
  reducedMotion: boolean;
  result: boolean | null;
}

describeFeature(feature, (f) => {
  function pulseScenario(
    name: string,
    setup: {
      given: string;
      reduced: string;
      when: string;
      then: string;
    },
    world: {
      previousKey: string | number | null;
      reducedMotion: boolean;
      nextKey: string | number | null;
      expected: boolean;
    }
  ) {
    f.Scenario(name, ({ Given, And, When, Then }) => {
      const state: PulseWorld = {
        previousKey: world.previousKey,
        reducedMotion: world.reducedMotion,
        result: null,
      };
      Given(setup.given, () => {
        expect(state.previousKey).toBe(world.previousKey);
      });
      And(setup.reduced, () => {
        expect(state.reducedMotion).toBe(world.reducedMotion);
      });
      When(setup.when, () => {
        state.result = shouldPulse(state.previousKey, world.nextKey, state.reducedMotion);
      });
      Then(setup.then, () => {
        expect(state.result).toBe(world.expected);
      });
    });
  }

  pulseScenario(
    'A changed value pulses',
    {
      given: 'the previous pulse key is "1204567"',
      reduced: 'reduced motion is off',
      when: 'the next pulse key is "1198432"',
      then: 'the pulse plays',
    },
    { previousKey: '1204567', reducedMotion: false, nextKey: '1198432', expected: true }
  );

  pulseScenario(
    'First paint never pulses',
    {
      given: 'there is no previous pulse key',
      reduced: 'reduced motion is off',
      when: 'the next pulse key is "1198432"',
      then: 'the pulse does not play',
    },
    { previousKey: null, reducedMotion: false, nextKey: '1198432', expected: false }
  );

  pulseScenario(
    'An unchanged value does not pulse',
    {
      given: 'the previous pulse key is "1198432"',
      reduced: 'reduced motion is off',
      when: 'the next pulse key is "1198432"',
      then: 'the pulse does not play',
    },
    { previousKey: '1198432', reducedMotion: false, nextKey: '1198432', expected: false }
  );

  pulseScenario(
    'Reduced motion suppresses the pulse',
    {
      given: 'the previous pulse key is "1204567"',
      reduced: 'reduced motion is on',
      when: 'the next pulse key is "1198432"',
      then: 'the pulse does not play',
    },
    { previousKey: '1204567', reducedMotion: true, nextKey: '1198432', expected: false }
  );

  pulseScenario(
    'Clearing a value does not pulse',
    {
      given: 'the previous pulse key is "1204567"',
      reduced: 'reduced motion is off',
      when: 'the next pulse key is missing',
      then: 'the pulse does not play',
    },
    { previousKey: '1204567', reducedMotion: false, nextKey: null, expected: false }
  );

  f.Scenario('Durations mirror the Tamagui animation config', ({ When, Then }) => {
    let durations: typeof MOTION_DURATIONS | null = null;
    When('the motion durations are read', () => {
      durations = MOTION_DURATIONS;
    });
    Then('fast is 120ms, medium is 250ms, slow is 350ms and bar is 1200ms', () => {
      expect(durations).toEqual({ fast: 120, medium: 250, slow: 350, bar: 1200 });
    });
  });
});
