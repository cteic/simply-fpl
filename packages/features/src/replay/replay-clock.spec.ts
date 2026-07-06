import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { describe, expect, it } from 'vitest';

import {
  createReplayClock,
  gwProgress,
  pauseReplayClock,
  playReplayClock,
  restartReplayClock,
  seekReplayClock,
  setReplaySpeed,
  tickReplayClock,
} from './replay-clock';
import type { ReplayClockState } from './replay-clock';
import type { ReplaySpeed } from './types';

const feature = await loadFeature('./replay-clock.feature');

interface ScenarioState {
  clock: ReplayClockState;
}

const scenario: ScenarioState = {
  clock: createReplayClock(),
};

describe('replay clock unit', () => {
  it('a fresh clock yields a 0 progress and GW 1 start', () => {
    const clock = createReplayClock({ startGw: 1, endGw: 38 });
    expect(clock.gw).toBe(1);
    expect(clock.status).toBe('paused');
    expect(gwProgress(clock)).toBe(0);
  });

  it('setReplaySpeed updates the speed field without affecting progress', () => {
    const clock = playReplayClock(createReplayClock({ speed: 1 }));
    const advanced = tickReplayClock(clock, 30_000);
    const faster = setReplaySpeed(advanced, 16);
    expect(faster.speed).toBe(16);
    expect(faster.gw).toBe(advanced.gw);
    expect(faster.positionInGwMs).toBe(advanced.positionInGwMs);
  });

  it('a paused clock ignores ticks', () => {
    const clock = createReplayClock({ status: 'paused' });
    const next = tickReplayClock(clock, 5_000);
    expect(next).toEqual(clock);
  });

  it('pause stops a playing clock without resetting position', () => {
    const playing = playReplayClock(createReplayClock());
    const advanced = tickReplayClock(playing, 15_000);
    const paused = pauseReplayClock(advanced);
    expect(paused.status).toBe('paused');
    expect(paused.positionInGwMs).toBe(advanced.positionInGwMs);
  });

  it('yields the expected per-tick frame sequence at a given speed', () => {
    let clock = playReplayClock(createReplayClock({ gwDurationMs: 60_000, speed: 60 }));
    const frames: Array<{ gw: number; progress: number }> = [];
    // 1000ms-per-frame at speed 60 → one GW per frame. Five ticks should
    // step through GW 1 → 2 → 3 → 4 → 5.
    for (let i = 0; i < 5; i++) {
      clock = tickReplayClock(clock, 1_000);
      frames.push({ gw: clock.gw, progress: gwProgress(clock) });
    }
    expect(frames.map((f) => f.gw)).toEqual([2, 3, 4, 5, 6]);
    expect(frames.every((f) => f.progress === 0)).toBe(true);
  });
});

describeFeature(feature, ({ Scenario }) => {
  Scenario('A new clock starts paused at the first gameweek', ({ Given, Then, And }) => {
    Given('a replay clock with start GW 1 and end GW 38', () => {
      scenario.clock = createReplayClock({ startGw: 1, endGw: 38 });
    });
    Then('the clock is paused at GW 1', () => {
      expect(scenario.clock.status).toBe('paused');
      expect(scenario.clock.gw).toBe(1);
    });
    And('the GW progress is 0', () => {
      expect(gwProgress(scenario.clock)).toBe(0);
    });
  });

  Scenario(
    'A single tick at 60x advances exactly one gameweek per second',
    ({ Given, When, Then }) => {
      Given('a playing replay clock at speed 60 with 60000ms gameweek duration', () => {
        scenario.clock = playReplayClock(
          createReplayClock({ speed: 60 as ReplaySpeed, gwDurationMs: 60_000 })
        );
      });
      When('the clock advances 1000ms', () => {
        scenario.clock = tickReplayClock(scenario.clock, 1_000);
      });
      Then('the clock is at GW 2 with progress 0', () => {
        expect(scenario.clock.gw).toBe(2);
        expect(gwProgress(scenario.clock)).toBe(0);
      });
    }
  );

  Scenario(
    'A tick mid-gameweek leaves the clock partway through the same GW',
    ({ Given, When, Then }) => {
      Given('a playing replay clock at speed 1 with 60000ms gameweek duration', () => {
        scenario.clock = playReplayClock(createReplayClock({ speed: 1, gwDurationMs: 60_000 }));
      });
      When('the clock advances 30000ms', () => {
        scenario.clock = tickReplayClock(scenario.clock, 30_000);
      });
      Then('the clock is at GW 1 with progress 0.5', () => {
        expect(scenario.clock.gw).toBe(1);
        expect(gwProgress(scenario.clock)).toBeCloseTo(0.5, 5);
      });
    }
  );

  Scenario(
    'Playing past the end leaves the clock finished on the final GW',
    ({ Given, When, Then }) => {
      Given(
        'a playing replay clock at speed 60 with 60000ms gameweek duration starting at GW 37 ending at GW 38',
        () => {
          scenario.clock = playReplayClock(
            createReplayClock({
              startGw: 37,
              endGw: 38,
              speed: 60 as ReplaySpeed,
              gwDurationMs: 60_000,
            })
          );
        }
      );
      When('the clock advances 10000ms', () => {
        scenario.clock = tickReplayClock(scenario.clock, 10_000);
      });
      Then('the clock is finished at GW 38 with progress 1', () => {
        expect(scenario.clock.status).toBe('finished');
        expect(scenario.clock.gw).toBe(38);
        expect(gwProgress(scenario.clock)).toBe(1);
      });
    }
  );

  Scenario('Seeking jumps to the start of the requested gameweek', ({ Given, When, Then, And }) => {
    Given('a paused replay clock at GW 5', () => {
      scenario.clock = seekReplayClock(createReplayClock(), 5);
    });
    When('the clock seeks to GW 17', () => {
      scenario.clock = seekReplayClock(scenario.clock, 17);
    });
    Then('the clock is paused at GW 17', () => {
      expect(scenario.clock.status).toBe('paused');
      expect(scenario.clock.gw).toBe(17);
    });
    And('the GW progress is 0', () => {
      expect(gwProgress(scenario.clock)).toBe(0);
    });
  });

  Scenario(
    'Restarting from the finished state plays again from the start',
    ({ Given, When, Then, And }) => {
      Given('a finished replay clock with start GW 1 and end GW 38', () => {
        const finished: ReplayClockState = {
          ...createReplayClock({ startGw: 1, endGw: 38 }),
          status: 'finished',
          gw: 38,
          positionInGwMs: 60_000,
        };
        scenario.clock = finished;
      });
      When('the clock is restarted', () => {
        scenario.clock = restartReplayClock(scenario.clock);
      });
      Then('the clock is at GW 1 with progress 0', () => {
        expect(scenario.clock.gw).toBe(1);
        expect(gwProgress(scenario.clock)).toBe(0);
      });
      And('the clock is playing', () => {
        expect(scenario.clock.status).toBe('playing');
      });
    }
  );
});
