import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';

import type { ExpectedCurve, ManagerDistribution } from '@simplyfpl/fpl-client';
import { findFrameNearElapsed } from '@simplyfpl/fpl-client';
import type { FplBootstrapStatic, FplEntryGameweekPicks } from '@simplyfpl/types';

import type { CohortReplayResult } from './cohort-simulator';
import { frameNearestElapsed, relativeError, runCohortReplay } from './cohort-simulator';

const feature = await loadFeature('./cohort-simulator.feature');

const RECORDINGS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  'var',
  'recordings',
  'gw36'
);

function readBundleFile(name: string): string {
  return readFileSync(join(RECORDINGS_DIR, name), 'utf8');
}

const recordingJsonl = readBundleFile('recording.jsonl');
const testTeam: FplEntryGameweekPicks = JSON.parse(readBundleFile('test-team.json'));
const distribution: ManagerDistribution = JSON.parse(readBundleFile('manager-distribution.json'));
const expectedCurve: ExpectedCurve = JSON.parse(readBundleFile('expected-curve.json'));

const EMPTY_BOOTSTRAP: FplBootstrapStatic = {
  elements: [],
  teams: [],
  events: [],
  element_types: [],
};

const SPEED = 10;
const T_PLUS_30_SECONDS = 30 * 60;
const TRACK_TOLERANCE = 0.05;
const CONVERGE_TOLERANCE = 0.01;

interface ScenarioState {
  result: CohortReplayResult | null;
}

const scenarioState: ScenarioState = { result: null };

function replay(): CohortReplayResult {
  return runCohortReplay({
    recordingJsonl,
    testTeam,
    distribution,
    bootstrap: EMPTY_BOOTSTRAP,
    preGwRank: expectedCurve.preGwRank,
    totalManagers: expectedCurve.totalManagers,
    speed: SPEED,
  });
}

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'The live-rank estimate tracks the expected curve at T+30 minutes',
    ({ Given, When, Then, And }) => {
      Given('the gw36 replay bundle is loaded', () => {
        scenarioState.result = null;
        expect(distribution.gw).toBe(36);
        expect(expectedCurve.gw).toBe(36);
      });
      When('the cohort engine replays the recording at 10x speed', () => {
        scenarioState.result = replay();
      });
      Then('the replay cadence is compressed 10x against wall-clock time', () => {
        const result = scenarioState.result;
        expect(result).not.toBeNull();
        if (!result) return;
        expect(result.speed).toBe(SPEED);
        expect(result.replaySpanMs).toBeCloseTo(result.recordingSpanMs / SPEED, 6);
        expect(result.recordingSpanMs).toBeGreaterThan(0);
      });
      And('the live-rank estimate at T+30 minutes is within 5% of the expected curve', () => {
        const result = scenarioState.result;
        expect(result).not.toBeNull();
        if (!result) return;
        const actual = frameNearestElapsed(result.frames, T_PLUS_30_SECONDS);
        const expected = findFrameNearElapsed(expectedCurve, T_PLUS_30_SECONDS);
        expect(actual).not.toBeNull();
        expect(expected).not.toBeNull();
        if (!actual || !expected) return;
        expect(actual.elapsedSeconds).toBe(T_PLUS_30_SECONDS);
        expect(relativeError(actual.estimatedRank, expected.expectedRank)).toBeLessThanOrEqual(
          TRACK_TOLERANCE
        );
      });
    }
  );

  Scenario(
    'The live-rank estimate converges to the official rank at full-time',
    ({ Given, When, Then, And }) => {
      Given('the gw36 replay bundle is loaded', () => {
        scenarioState.result = null;
        expect(distribution.gw).toBe(36);
        expect(expectedCurve.gw).toBe(36);
      });
      When('the cohort engine replays the recording at 10x speed', () => {
        scenarioState.result = replay();
      });
      Then('the final live-rank estimate is within 1% of the official end-of-gameweek rank', () => {
        const result = scenarioState.result;
        expect(result).not.toBeNull();
        if (!result) return;
        const finalFrame = result.frames[result.frames.length - 1];
        expect(finalFrame).toBeDefined();
        if (!finalFrame) return;
        expect(
          relativeError(finalFrame.estimatedRank, expectedCurve.officialEndRank)
        ).toBeLessThanOrEqual(CONVERGE_TOLERANCE);
      });
      And('the manager has climbed above the pre-gameweek rank', () => {
        const result = scenarioState.result;
        expect(result).not.toBeNull();
        if (!result) return;
        const finalFrame = result.frames[result.frames.length - 1];
        expect(finalFrame).toBeDefined();
        if (!finalFrame) return;
        expect(finalFrame.estimatedRank).toBeLessThan(result.preGwRank);
      });
    }
  );
});
