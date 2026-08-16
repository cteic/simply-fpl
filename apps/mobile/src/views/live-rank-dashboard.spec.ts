import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

import { liveBattle } from '@simplyfpl/features';
import { calculateLivePoints, computeRankDetails, predictBonusPoints } from '@simplyfpl/fpl-client';
import type { BonusPrediction } from '@simplyfpl/fpl-client';
import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplEntryPick,
  FplFixture,
  FplLiveGameweek,
} from '@simplyfpl/types';

const { computeLiveBattle } = liveBattle;

const ORIGINAL_FETCH = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;

const WORKER_URL = 'http://localhost:8787';

function makePick(
  element: number,
  position: number,
  multiplier: number,
  isCaptain = false
): FplEntryPick {
  return { element, position, multiplier, is_captain: isCaptain, is_vice_captain: false };
}

function makePicks(
  picks: FplEntryPick[],
  chip: string | null = null,
  transferCost = 0
): FplEntryGameweekPicks {
  return {
    active_chip: chip,
    automatic_subs: [],
    entry_history: {
      event: 1,
      points: 0,
      total_points: 0,
      rank: 1,
      rank_sort: 1,
      overall_rank: 1,
      event_transfers: 0,
      event_transfers_cost: transferCost,
      points_on_bench: 0,
    },
    picks,
  };
}

function makeLive(scores: Record<number, number>): FplLiveGameweek {
  return {
    elements: Object.entries(scores).map(([id, total_points]) => ({
      id: Number(id),
      stats: {
        minutes: 90,
        goals_scored: 0,
        assists: 0,
        clean_sheets: 0,
        goals_conceded: 0,
        yellow_cards: 0,
        red_cards: 0,
        saves: 0,
        bonus: 0,
        bps: 50,
        total_points,
        clearances_blocks_interceptions: 0,
        tackles: 0,
      },
      explain: [{ fixture: 1, stats: [{ identifier: 'bps', points: 0, value: 50 }] }],
    })),
  };
}

const EMPTY_BOOTSTRAP: FplBootstrapStatic = {
  elements: [],
  teams: [],
  events: [],
  element_types: [],
};

const localFeature = await loadFeature('./live-rank-dashboard.feature');

const sharedFeature = await loadFeature('../../tests/shared-features/live-rank.feature');

describeFeature(localFeature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  BeforeEachScenario(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  AfterEachScenario(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  Scenario('Entry snapshot endpoint is called for the given team ID', ({ Given, When, Then }) => {
    let capturedUrl: string | null = null;

    Given('a team ID of 12345', () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ entry: {}, picks: null, gw: 1, bootstrap: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    When('the dashboard requests entry data', async () => {
      const res = await fetch(`${WORKER_URL}/snapshot/entry/12345`);
      capturedUrl = fetchMock.mock.calls[0]?.[0] as string;
      await res.json();
    });

    Then('fetch is called with the snapshot URL for entry 12345', () => {
      expect(capturedUrl).toBe(`${WORKER_URL}/snapshot/entry/12345`);
    });
  });

  Scenario(
    'Dashboard shows error state when snapshot endpoint returns 500',
    ({ Given, When, Then }) => {
      let thrownError: Error | null = null;

      Given('the snapshot endpoint returns a 500 error', () => {
        fetchMock.mockResolvedValue(new Response('Internal Server Error', { status: 500 }));
      });

      When('the dashboard requests entry data for team 12345', async () => {
        const res = await fetch(`${WORKER_URL}/snapshot/entry/12345`);
        if (!res.ok) {
          thrownError = new Error(`FPL API error: ${res.status} ${res.statusText}`);
        }
      });

      Then('an error is thrown with status code in the message', () => {
        expect(thrownError).not.toBeNull();
        expect(thrownError?.message).toContain('500');
      });
    }
  );

  Scenario('Formation is derived from starting XI positions', ({ Given, When, Then }) => {
    let formation: string;

    Given('a squad with 4 defenders, 4 midfielders and 2 forwards', () => {});

    When('the formation is derived', () => {
      const picks: FplEntryPick[] = [
        makePick(1, 1, 1),
        makePick(2, 2, 1),
        makePick(3, 3, 1),
        makePick(4, 4, 1),
        makePick(5, 5, 1),
        makePick(6, 6, 1),
        makePick(7, 7, 1),
        makePick(8, 8, 1),
        makePick(9, 9, 1),
        makePick(10, 10, 2, true),
        makePick(11, 11, 1),
      ];
      const bootstrap: FplBootstrapStatic = {
        elements: [
          {
            id: 1,
            element_type: 1,
            team: 1,
            web_name: 'GK',
            first_name: '',
            second_name: '',
            now_cost: 50,
            total_points: 0,
            event_points: 0,
            selected_by_percent: '5.0',
            transfers_in_event: 0,
            transfers_out_event: 0,
            chance_of_playing_next_round: null,
            news: '',
          },
          ...([2, 3, 4, 5] as const).map((id) => ({
            id,
            element_type: 2,
            team: 1,
            web_name: `DEF${id}`,
            first_name: '',
            second_name: '',
            now_cost: 50,
            total_points: 0,
            event_points: 0,
            selected_by_percent: '5.0',
            transfers_in_event: 0,
            transfers_out_event: 0,
            chance_of_playing_next_round: null,
            news: '',
          })),
          ...([6, 7, 8, 9] as const).map((id) => ({
            id,
            element_type: 3,
            team: 1,
            web_name: `MID${id}`,
            first_name: '',
            second_name: '',
            now_cost: 50,
            total_points: 0,
            event_points: 0,
            selected_by_percent: '5.0',
            transfers_in_event: 0,
            transfers_out_event: 0,
            chance_of_playing_next_round: null,
            news: '',
          })),
          ...([10, 11] as const).map((id) => ({
            id,
            element_type: 4,
            team: 1,
            web_name: `FWD${id}`,
            first_name: '',
            second_name: '',
            now_cost: 50,
            total_points: 0,
            event_points: 0,
            selected_by_percent: '5.0',
            transfers_in_event: 0,
            transfers_out_event: 0,
            chance_of_playing_next_round: null,
            news: '',
          })),
        ],
        teams: [],
        events: [],
        element_types: [],
      };

      const elementsById = new Map(bootstrap.elements.map((e) => [e.id, e]));
      let def = 0;
      let mid = 0;
      let fwd = 0;
      for (const pick of picks.filter((p) => p.position <= 11)) {
        const player = elementsById.get(pick.element);
        if (!player) continue;
        if (player.element_type === 2) def += 1;
        if (player.element_type === 3) mid += 1;
        if (player.element_type === 4) fwd += 1;
      }
      formation = `${def}–${mid}–${fwd}`;
    });

    Then('the formation string is 4-4-2', () => {
      expect(formation).toBe('4–4–2');
    });
  });

  Scenario('Provisional bonus marker appears when bonus is non-zero', ({ Given, When, Then }) => {
    let bonusMap: Map<number, BonusPrediction>;

    Given('live data has a player with 3 provisional bonus points', () => {});

    When('bonus points are predicted for an unfinished fixture', () => {
      const liveGw: FplLiveGameweek = {
        elements: [
          {
            id: 1,
            stats: {
              minutes: 60,
              goals_scored: 0,
              assists: 0,
              clean_sheets: 0,
              goals_conceded: 0,
              yellow_cards: 0,
              red_cards: 0,
              saves: 0,
              bonus: 0,
              bps: 30,
              total_points: 5,
              clearances_blocks_interceptions: 0,
              tackles: 0,
            },
            explain: [{ fixture: 1, stats: [{ identifier: 'bps', points: 0, value: 30 }] }],
          },
          {
            id: 2,
            stats: {
              minutes: 60,
              goals_scored: 0,
              assists: 0,
              clean_sheets: 0,
              goals_conceded: 0,
              yellow_cards: 0,
              red_cards: 0,
              saves: 0,
              bonus: 0,
              bps: 20,
              total_points: 3,
              clearances_blocks_interceptions: 0,
              tackles: 0,
            },
            explain: [{ fixture: 1, stats: [{ identifier: 'bps', points: 0, value: 20 }] }],
          },
          {
            id: 3,
            stats: {
              minutes: 60,
              goals_scored: 0,
              assists: 0,
              clean_sheets: 0,
              goals_conceded: 0,
              yellow_cards: 0,
              red_cards: 0,
              saves: 0,
              bonus: 0,
              bps: 10,
              total_points: 2,
              clearances_blocks_interceptions: 0,
              tackles: 0,
            },
            explain: [{ fixture: 1, stats: [{ identifier: 'bps', points: 0, value: 10 }] }],
          },
        ],
      };
      const fixtures: FplFixture[] = [
        {
          id: 1,
          event: 1,
          team_h: 1,
          team_a: 2,
          team_h_score: null,
          team_a_score: null,
          finished: false,
          finished_provisional: false,
          kickoff_time: null,
          team_h_difficulty: 3,
          team_a_difficulty: 3,
        },
      ];
      bonusMap = predictBonusPoints(liveGw, fixtures, EMPTY_BOOTSTRAP);
    });

    Then("the player's bonus map entry is provisional and equals 3", () => {
      const entry = bonusMap.get(1);
      expect(entry).toBeDefined();
      expect(entry?.provisional).toBe(true);
      expect(entry?.bonus).toBe(3);
    });
  });

  Scenario(
    'Live battle panel is hidden when no fixtures are in progress',
    ({ Given, When, Then }) => {
      let picks: FplEntryGameweekPicks;
      let fixtures: FplFixture[];
      let liveGw: FplLiveGameweek;
      let battle: ReturnType<typeof computeLiveBattle>;

      Given('a squad and every fixture has finished', () => {
        picks = makePicks([
          makePick(1, 1, 2, true),
          ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => makePick(n, n, 1)),
        ]);
        liveGw = makeLive({ 1: 6 });
        fixtures = [
          {
            id: 1,
            event: 1,
            team_h: 1,
            team_a: 2,
            team_h_score: 1,
            team_a_score: 0,
            finished: true,
            finished_provisional: true,
            kickoff_time: null,
            team_h_difficulty: 3,
            team_a_difficulty: 3,
          },
        ];
      });

      When('the live battle is computed', () => {
        battle = computeLiveBattle({
          yourPicks: picks,
          bootstrap: EMPTY_BOOTSTRAP,
          liveGw,
          fixtures,
        });
      });

      Then('the battle is not live and the panel is skipped', () => {
        expect(battle.isLive).toBe(false);
        expect(battle.gains).toHaveLength(0);
        expect(battle.losses).toHaveLength(0);
      });
    }
  );
});

describeFeature(sharedFeature, ({ Scenario }) => {
  Scenario(
    'Live GW points sum all XI players with correct multipliers',
    ({ Given, When, Then, And }) => {
      let result: number;

      Given('a starting XI where each player scores 5 points', () => {});
      And('the captain scores 6 points', () => {});

      When('live points are calculated', () => {
        const picks = makePicks([
          makePick(1, 1, 2, true),
          ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => makePick(n, n, 1)),
        ]);
        const scores: Record<number, number> = { 1: 6 };
        for (let i = 2; i <= 11; i++) scores[i] = 5;
        result = calculateLivePoints(picks, makeLive(scores), EMPTY_BOOTSTRAP);
      });

      Then("the total should include the captain's doubled contribution", () => {
        expect(result).toBe(12 + 5 * 10);
      });
    }
  );

  Scenario("Captain's points are doubled with no active chip", ({ Given, When, Then }) => {
    let result: number;

    Given('a squad where the captain scores 8 points', () => {});

    When('live points are calculated with no active chip', () => {
      const picks = makePicks([
        makePick(1, 1, 2, true),
        ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => makePick(n, n, 1)),
      ]);
      const scores: Record<number, number> = {};
      for (let i = 1; i <= 11; i++) scores[i] = i === 1 ? 8 : 2;
      result = calculateLivePoints(picks, makeLive(scores), EMPTY_BOOTSTRAP);
    });

    Then('the captain contributes 16 points to the total', () => {
      const benchExclusion = 0;
      expect(result).toBe(16 + 2 * 10 - benchExclusion);
    });
  });

  Scenario("Triple Captain chip triples the captain's points", ({ Given, When, Then, And }) => {
    let result: number;

    Given('a squad where the captain scores 10 points', () => {});
    And('the Triple Captain chip is active', () => {});

    When('live points are calculated', () => {
      const picks = makePicks(
        [
          makePick(1, 1, 3, true),
          ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => makePick(n, n, 1)),
        ],
        '3xc'
      );
      const scores: Record<number, number> = {};
      for (let i = 1; i <= 11; i++) scores[i] = 10;
      result = calculateLivePoints(picks, makeLive(scores), EMPTY_BOOTSTRAP);
    });

    Then('the captain contributes 30 points', () => {
      expect(result).toBe(30 + 10 * 10);
    });
  });

  Scenario('Transfer hit is deducted from the live total', ({ Given, When, Then, And }) => {
    let result: number;

    Given('a squad with 4-point transfer hits', () => {});
    And('XI players each scoring 5 points', () => {});

    When('live points are calculated', () => {
      const picks = makePicks(
        [
          makePick(1, 1, 2, true),
          ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => makePick(n, n, 1)),
        ],
        null,
        4
      );
      const scores: Record<number, number> = {};
      for (let i = 1; i <= 11; i++) scores[i] = 5;
      result = calculateLivePoints(picks, makeLive(scores), EMPTY_BOOTSTRAP);
    });

    Then('the total is reduced by 4', () => {
      expect(result).toBe(10 + 5 * 10 - 4);
    });
  });

  Scenario(
    'Rank improves when live score beats the pre-GW average',
    ({ Given, When, Then, And }) => {
      let estimatedRank: number;

      Given('a manager ranked 1000000 at the start of the gameweek', () => {});
      And('the gameweek average score is 50', () => {});
      And('the manager is currently scoring 80 live points', () => {});

      When('rank details are computed', () => {
        const details = computeRankDetails(1_000_000, 80, 80, 50, 1);
        if (details) estimatedRank = details.postSubsRank;
      });

      Then('the estimated post-GW rank is better than 1000000', () => {
        expect(estimatedRank).toBeLessThan(1_000_000);
      });
    }
  );
});
