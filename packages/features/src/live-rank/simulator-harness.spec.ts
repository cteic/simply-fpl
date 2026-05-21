import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';

import { parseRecording } from '@simplyfpl/fpl-client';
import type { ExpectedCurve, ManagerDistribution, RecordingRow } from '@simplyfpl/fpl-client';
import type { FplBootstrapStatic, FplEntryGameweekPicks } from '@simplyfpl/types';

import {
  type RankSimulationResult,
  frameNearestElapsed,
  relativeError,
  simulateRankTrajectory,
} from './simulator-harness';

const feature = await loadFeature('./simulator-harness.feature');

const BUNDLE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '__fixtures__/simulator/gw37');
const GW = 37;
const MID_GW_SECONDS = 30 * 60;
const EMPTY_BOOTSTRAP: FplBootstrapStatic = {
  elements: [],
  teams: [],
  events: [],
  element_types: [],
};

function readJson(name: string): string {
  return readFileSync(resolve(BUNDLE_DIR, name), 'utf8');
}

const rows: RecordingRow[] = parseRecording(readJson('recording.jsonl'));
const distribution: ManagerDistribution = JSON.parse(readJson('manager-distribution.json'));
const testTeam: FplEntryGameweekPicks = JSON.parse(readJson('test-team.json'));
const committed: ExpectedCurve = JSON.parse(readJson('expected-curve.json'));

function runSimulation(preGwRank: number): RankSimulationResult {
  return simulateRankTrajectory({
    gw: GW,
    rows,
    testTeam,
    distribution,
    bootstrap: EMPTY_BOOTSTRAP,
    preGwRank,
    totalManagers: committed.totalManagers,
  });
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('the gw37 simulator recording, test team and synthetic manager pool', () => {
      expect(rows.length).toBeGreaterThan(1);
      expect(distribution.managers.length).toBeGreaterThan(0);
      expect(testTeam.picks).toHaveLength(15);
      expect(committed.frames).toHaveLength(rows.length);
    });
  });

  Scenario('Live rank estimate tracks the expected curve mid-gameweek', ({ Given, When, Then }) => {
    let preGwRank = 0;
    let result: RankSimulationResult;

    Given('my pre-gameweek overall rank is 38859', () => {
      preGwRank = 38_859;
    });

    When('30 minutes of the simulated gameweek have replayed', () => {
      result = runSimulation(preGwRank);
    });

    Then('my live rank estimate is within 5% of the expected curve', () => {
      const point = frameNearestElapsed(result.trajectory, MID_GW_SECONDS);
      const expectedFrame = committed.frames.find((f) => f.rowIndex === point?.rowIndex);
      expect(point).not.toBeNull();
      expect(expectedFrame).toBeDefined();
      if (!point || !expectedFrame) throw new Error('missing mid-gameweek frame');
      expect(relativeError(point.estimatedRank, expectedFrame.expectedRank)).toBeLessThanOrEqual(
        0.05
      );
    });
  });

  Scenario(
    'Live rank converges to the official rank at full-time',
    ({ Given, When, Then, And }) => {
      let preGwRank = 0;
      let result: RankSimulationResult;

      Given('my pre-gameweek overall rank is 38859', () => {
        preGwRank = 38_859;
      });

      When('the simulated gameweek has fully replayed', () => {
        result = runSimulation(preGwRank);
      });

      Then('my live rank estimate matches the official end-of-gameweek rank within 1%', () => {
        const final = result.trajectory[result.trajectory.length - 1];
        if (!final) throw new Error('no final frame');
        expect(relativeError(final.estimatedRank, committed.officialEndRank)).toBeLessThanOrEqual(
          0.01
        );
      });

      And('my final live rank is better than my pre-gameweek rank', () => {
        expect(result.officialEndRank).toBeLessThan(preGwRank);
      });
    }
  );

  Scenario('Replaying the recording reproduces the committed expected curve', ({ When, Then }) => {
    let result: RankSimulationResult;

    When('I replay the full recording through the live-rank logic', () => {
      result = runSimulation(committed.preGwRank);
    });

    Then('every frame matches the committed expected-rank curve', () => {
      expect(result.trajectory).toHaveLength(committed.frames.length);
      result.trajectory.forEach((point, index) => {
        const expected = committed.frames[index];
        expect(expected).toBeDefined();
        expect(point.elapsedSeconds).toBe(expected?.elapsedSeconds);
        expect(point.myPoints).toBe(expected?.myPoints);
        expect(point.avgScore).toBe(expected?.avgScore);
        expect(point.estimatedRank).toBe(expected?.expectedRank);
      });
      expect(result.officialEndRank).toBe(committed.officialEndRank);
    });
  });
});
