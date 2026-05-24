import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { FplFixture } from '@simplyfpl/types';

import { buildSlimFixtures } from './slim-fixtures';

const feature = await loadFeature('./slim-fixtures.feature');

const FIXTURE_FIELDS = [
  'id',
  'event',
  'started',
  'finished',
  'finished_provisional',
  'kickoff_time',
  'team_h',
  'team_a',
  'team_h_score',
  'team_a_score',
  'team_h_difficulty',
  'team_a_difficulty',
];

function makeRawFixtures(): FplFixture[] {
  const raw: FplFixture & Record<string, unknown> = {
    id: 7,
    event: 21,
    started: true,
    finished: false,
    finished_provisional: false,
    kickoff_time: '2026-01-01T15:00:00Z',
    team_h: 1,
    team_a: 2,
    team_h_score: 1,
    team_a_score: 0,
    team_h_difficulty: 3,
    team_a_difficulty: 4,
    code: 2444470,
    pulse_id: 115827,
    minutes: 67,
    provisional_start_time: false,
    stats: [
      { identifier: 'bps', a: [], h: [{ value: 30, element: 1 }] },
      { identifier: 'goals_scored', a: [], h: [{ value: 1, element: 1 }] },
    ],
  };
  return [raw];
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Slim fixtures drop the per-fixture stats blob', ({ Given, When, Then, And }) => {
    let raw: FplFixture[];
    let slim: FplFixture[];

    Given('a raw fixtures list carrying a stats array', () => {
      raw = makeRawFixtures();
    });

    When('the worker slims the fixtures', () => {
      slim = buildSlimFixtures(raw);
    });

    Then('each fixture exposes exactly the declared FplFixture fields', () => {
      expect(Object.keys(slim[0] ?? {}).sort()).toEqual([...FIXTURE_FIELDS].sort());
    });

    And('the FDR, kickoff and result fields keep their real values', () => {
      const fixture = slim[0];
      expect(fixture?.event).toBe(21);
      expect(fixture?.started).toBe(true);
      expect(fixture?.kickoff_time).toBe('2026-01-01T15:00:00Z');
      expect(fixture?.team_h).toBe(1);
      expect(fixture?.team_a).toBe(2);
      expect(fixture?.team_h_difficulty).toBe(3);
      expect(fixture?.team_a_difficulty).toBe(4);
    });

    And('the heavy upstream-only fields are dropped', () => {
      const keys = Object.keys(slim[0] ?? {});
      expect(keys).not.toContain('stats');
      expect(keys).not.toContain('code');
      expect(keys).not.toContain('pulse_id');
      expect(keys).not.toContain('minutes');
    });
  });
});
