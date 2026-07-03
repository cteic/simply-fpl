import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type {
  FplBootstrapStatic,
  FplEntry,
  FplEntryGameweekPicks,
  FplEntrySnapshot,
  FplFixture,
} from '@simplyfpl/types';

import { buildEnrichedContext, computeFrankAskCacheKey } from './prompt-context';
import type { FrankContextInput, FrankPriceChange } from './prompt-context';

const feature = await loadFeature('./prompt-context.feature');

function makeBootstrap(
  players: Array<{ id: number; web_name: string; team: number }>,
  teams: Array<{ id: number; short_name: string }>
): FplBootstrapStatic {
  return {
    elements: players.map((p) => ({
      id: p.id,
      web_name: p.web_name,
      first_name: '',
      second_name: '',
      team: p.team,
      element_type: 3,
      now_cost: 100,
      total_points: 50,
      event_points: 5,
      selected_by_percent: '10.0',
      transfers_in_event: 0,
      transfers_out_event: 0,
      chance_of_playing_next_round: 100,
      news: '',
    })),
    teams: teams.map((t) => ({
      id: t.id,
      name: t.short_name,
      short_name: t.short_name,
      code: t.id,
    })),
    events: [],
    element_types: [],
  };
}

function makeEntry(): FplEntry {
  return {
    id: 1,
    player_first_name: 'Test',
    player_last_name: 'User',
    name: 'Test FC',
    summary_overall_rank: 500_000,
    summary_overall_points: 900,
    summary_event_rank: null,
    summary_event_points: 55,
  };
}

function makePicks(elementIds: number[]): FplEntryGameweekPicks {
  return {
    active_chip: null,
    automatic_subs: [],
    entry_history: {
      event: 11,
      points: 55,
      total_points: 900,
      rank: 100_000,
      rank_sort: 100_000,
      overall_rank: 500_000,
      event_transfers: 1,
      event_transfers_cost: 0,
      points_on_bench: 5,
    },
    picks: elementIds.map((id, i) => ({
      element: id,
      position: i + 1,
      multiplier: i === 0 ? 2 : 1,
      is_captain: i === 0,
      is_vice_captain: i === 1,
    })),
  };
}

function makeSnapshot(
  bootstrap: FplBootstrapStatic,
  picks: FplEntryGameweekPicks | null,
  gw = 11
): FplEntrySnapshot {
  return {
    bootstrap,
    entry: makeEntry(),
    picks,
    gw,
    picksAvailable: picks !== null,
  };
}

function makeFixture(
  id: number,
  event: number,
  teamH: number,
  teamA: number,
  hDiff: number,
  aDiff: number
): FplFixture {
  return {
    id,
    event,
    finished: false,
    kickoff_time: null,
    team_h: teamH,
    team_a: teamA,
    team_h_score: null,
    team_a_score: null,
    team_h_difficulty: hDiff as FplFixture['team_h_difficulty'],
    team_a_difficulty: aDiff as FplFixture['team_a_difficulty'],
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'Enriched context includes player names and team for each squad pick',
    ({ Given, And, When, Then }) => {
      let input: FrankContextInput;
      let result: string;

      Given('a snapshot with one pick: player id 1 named "Salah" on team "LIV"', () => {
        const bootstrap = makeBootstrap(
          [{ id: 1, web_name: 'Salah', team: 1 }],
          [{ id: 1, short_name: 'LIV' }]
        );
        input = {
          snapshot: makeSnapshot(bootstrap, makePicks([1])),
          fixtures: null,
          priceChanges: null,
          currentGw: 10,
        };
      });

      And('no fixtures', () => {
        // already null
      });

      And('no price changes', () => {
        // already null
      });

      When('buildEnrichedContext is called', () => {
        result = buildEnrichedContext(input);
      });

      Then('the context JSON contains a squad entry with name "Salah" and team "LIV"', () => {
        const parsed = JSON.parse(result) as { squad: Array<{ name: string; team: string }> };
        expect(parsed.squad).toBeDefined();
        const salah = parsed.squad.find((p) => p.name === 'Salah');
        expect(salah).toBeDefined();
        expect(salah?.team).toBe('LIV');
      });
    }
  );

  Scenario(
    'Enriched context includes next-3 fixture difficulty ratings',
    ({ Given, And, When, Then }) => {
      let input: FrankContextInput;
      let result: string;

      Given('a snapshot with one pick: player id 1 on team id 1', () => {
        const bootstrap = makeBootstrap(
          [{ id: 1, web_name: 'Player1', team: 1 }],
          [{ id: 1, short_name: 'TST' }]
        );
        input = {
          snapshot: makeSnapshot(bootstrap, makePicks([1]), 11),
          fixtures: [],
          priceChanges: null,
          currentGw: 10,
        };
      });

      And('fixtures for GW11, GW12, GW13 giving team 1 difficulties 2, 3, 4', () => {
        input = {
          ...input,
          fixtures: [
            makeFixture(1, 11, 1, 2, 2, 3),
            makeFixture(2, 12, 3, 1, 4, 3),
            makeFixture(3, 13, 1, 4, 4, 5),
          ],
        };
      });

      And('no price changes', () => {
        // already null
      });

      When('buildEnrichedContext is called with currentGw 10', () => {
        result = buildEnrichedContext(input);
      });

      Then('the squad entry for player id 1 has next_fdr [2, 3, 4]', () => {
        const parsed = JSON.parse(result) as {
          squad: Array<{ id: number; next_fdr?: number[] }>;
        };
        const player = parsed.squad.find((p) => p.id === 1);
        expect(player?.next_fdr).toEqual([2, 3, 4]);
      });
    }
  );

  Scenario(
    'Enriched context includes price direction for a squad player',
    ({ Given, And, When, Then }) => {
      let input: FrankContextInput;
      let result: string;

      Given('a snapshot with one pick: player id 1 named "Salah"', () => {
        const bootstrap = makeBootstrap(
          [{ id: 1, web_name: 'Salah', team: 1 }],
          [{ id: 1, short_name: 'LIV' }]
        );
        input = {
          snapshot: makeSnapshot(bootstrap, makePicks([1])),
          fixtures: null,
          priceChanges: null,
          currentGw: 10,
        };
      });

      And('no fixtures', () => {
        // already null
      });

      And('player id 1 is predicted to rise in price', () => {
        const rise: FrankPriceChange = {
          id: 1,
          web_name: 'Salah',
          direction: 'rise',
          probability: 0.7,
        };
        input = { ...input, priceChanges: [rise] };
      });

      When('buildEnrichedContext is called', () => {
        result = buildEnrichedContext(input);
      });

      Then('the squad entry for player id 1 has price_dir "rise"', () => {
        const parsed = JSON.parse(result) as {
          squad: Array<{ id: number; price_dir?: string }>;
        };
        const player = parsed.squad.find((p) => p.id === 1);
        expect(player?.price_dir).toBe('rise');
      });
    }
  );

  Scenario('Snapshot without picks returns entry summary only', ({ Given, When, Then }) => {
    let input: FrankContextInput;
    let result: string;

    Given('a snapshot with no picks', () => {
      const bootstrap = makeBootstrap([], []);
      input = {
        snapshot: makeSnapshot(bootstrap, null),
        fixtures: null,
        priceChanges: null,
        currentGw: 10,
      };
    });

    When('buildEnrichedContext is called', () => {
      result = buildEnrichedContext(input);
    });

    Then('the context JSON contains overall_rank but no squad key', () => {
      const parsed = JSON.parse(result) as { overall_rank?: number; squad?: unknown };
      expect(parsed.overall_rank).toBeDefined();
      expect(parsed.squad).toBeUndefined();
    });
  });

  Scenario('Identical question and squad produce the same cache key', ({ Given, When, Then }) => {
    const question = 'Who should I captain?';
    const squad = [1, 2, 3];
    let key1: string;
    let key2: string;

    Given('the question "Who should I captain?" and squad [1, 2, 3]', () => {
      // values declared above
    });

    When('computeFrankAskCacheKey is called twice with the same inputs', () => {
      key1 = computeFrankAskCacheKey(question, squad);
      key2 = computeFrankAskCacheKey(question, squad);
    });

    Then('both cache keys are equal and start with "frank:ask:"', () => {
      expect(key1).toBe(key2);
      expect(key1.startsWith('frank:ask:')).toBe(true);
    });
  });

  Scenario(
    'Question normalisation ignores casing and extra whitespace',
    ({ Given, And, When, Then }) => {
      const squad = [1, 2, 3];
      let key1: string;
      let key2: string;

      Given('the normalised question "  Who Should I Captain?  " and squad [1, 2, 3]', () => {
        key1 = computeFrankAskCacheKey('  Who Should I Captain?  ', squad);
      });

      And('the normalised question "who should i captain?" and squad [1, 2, 3]', () => {
        key2 = computeFrankAskCacheKey('who should i captain?', squad);
      });

      When('computeFrankAskCacheKey is called for each', () => {
        // already called above
      });

      Then('the two cache keys are equal', () => {
        expect(key1).toBe(key2);
      });
    }
  );
});
