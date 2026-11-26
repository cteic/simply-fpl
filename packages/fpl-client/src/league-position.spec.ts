import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type {
  FplBootstrapStatic,
  FplLeagueStanding,
  GameweekPhase,
  LeaguePosition,
} from '@simplyfpl/types';

import { describeLeaguePosition, getGameweekPhase } from './league-position';

const feature = await loadFeature('./league-position.feature');

function row(
  rank: number,
  entry: number,
  playerName: string,
  eventTotal: number,
  total: number
): FplLeagueStanding {
  return {
    id: entry,
    entry,
    entry_name: `Team ${entry}`,
    player_name: playerName,
    rank,
    last_rank: rank,
    rank_sort: rank,
    total,
    event_total: eventTotal,
  };
}

const ME = 219_895;

/** The Trycare league after GW11 2026/27, as FPL reports it. */
function league(): FplLeagueStanding[] {
  return [
    row(1, 1, 'Oliver Smith', 29, 735),
    row(2, 2, 'Jarred Cranfield', 24, 711),
    row(3, 3, 'Niall Cranfield', 48, 707),
    row(4, 4, 'Josh Allan', 35, 687),
    row(5, 5, 'John Preston', 37, 664),
    row(6, 6, 'Joanne Hurrell', 29, 659),
    row(7, 7, 'Andrew gilroy', 46, 658),
    row(8, 8, 'Ryan Allan', 44, 658),
    row(9, 9, 'Tom Ridgway', 35, 644),
    row(10, ME, 'Kyle Andrew Knowles', 25, 606),
    row(11, 11, 'Last Place', 31, 560),
  ];
}

function bootstrap(finished: boolean): FplBootstrapStatic {
  return {
    elements: [],
    teams: [],
    element_types: [],
    events: [
      {
        id: 11,
        name: 'Gameweek 11',
        deadline_time: '2026-11-21T11:00:00Z',
        is_current: true,
        is_next: false,
        is_previous: false,
        average_entry_score: 35,
        highest_score: 106,
        finished,
      },
    ],
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'The gaps to the managers above and below are reported',
    ({ Given, When, Then, And }) => {
      let position: LeaguePosition | null;

      Given('a real eleven-manager league with the manager in tenth', () => {
        position = null;
      });

      When('I describe their position', () => {
        position = describeLeaguePosition(league(), ME);
      });

      Then('they are tenth of eleven', () => {
        expect(position?.rank).toBe(10);
        expect(position?.managers).toBe(11);
      });

      And('the manager above is named with the points needed to draw level', () => {
        expect(position?.above).toEqual({ name: 'Tom Ridgway', gap: 38 });
      });

      And('the manager below is named with the cushion over them', () => {
        expect(position?.below).toEqual({ name: 'Last Place', gap: 46 });
      });

      And('the gap to the leader is reported', () => {
        expect(position?.gapToLeader).toBe(129);
      });
    }
  );

  Scenario('This gameweek is ranked within the league', ({ Given, When, Then }) => {
    let position: LeaguePosition | null;

    Given('a real eleven-manager league with the manager in tenth', () => {
      position = null;
    });

    When('I describe their position', () => {
      position = describeLeaguePosition(league(), ME);
    });

    Then("their gameweek score places them among the league's worst this week", () => {
      // 25 is the second-lowest score of the week: only 24 is worse.
      expect(position?.gameweekPlace).toBe(10);
    });
  });

  Scenario('The leader has nobody above', ({ Given, When, Then }) => {
    let position: LeaguePosition | null;

    Given('a real eleven-manager league', () => {
      position = null;
    });

    When("I describe the leader's position", () => {
      position = describeLeaguePosition(league(), 1);
    });

    Then('nobody is above them and the gap to the leader is zero', () => {
      expect(position?.above).toBeNull();
      expect(position?.gapToLeader).toBe(0);
      expect(position?.below).toEqual({ name: 'Jarred Cranfield', gap: 24 });
    });
  });

  Scenario('A manager not on the page is not guessed at', ({ Given, When, Then }) => {
    let position: LeaguePosition | null = null;

    Given('a real eleven-manager league', () => {
      position = null;
    });

    When('I describe the position of a manager who is not in it', () => {
      position = describeLeaguePosition(league(), 999_999);
    });

    Then('no position is returned', () => {
      expect(position).toBeNull();
    });
  });

  Scenario(
    'A finished gameweek is settled even though it is still current',
    ({ Given, When, Then }) => {
      let phase: GameweekPhase;

      Given('a bootstrap whose current gameweek has finished', () => {
        phase = 'pre';
      });

      When('I ask for the gameweek phase', () => {
        phase = getGameweekPhase(bootstrap(true), Date.parse('2026-11-26T19:00:00Z'));
      });

      Then('it is settled', () => {
        expect(phase).toBe('settled');
      });
    }
  );

  Scenario('A gameweek past its deadline and unfinished is live', ({ Given, When, Then, And }) => {
    let phase: GameweekPhase;

    Given('a bootstrap whose current gameweek is unfinished', () => {
      phase = 'pre';
    });

    When('I ask for the gameweek phase after the deadline', () => {
      phase = getGameweekPhase(bootstrap(false), Date.parse('2026-11-22T15:00:00Z'));
    });

    Then('it is live', () => {
      expect(phase).toBe('live');
    });

    And('before the deadline it is pre', () => {
      expect(getGameweekPhase(bootstrap(false), Date.parse('2026-11-20T15:00:00Z'))).toBe('pre');
    });
  });
});
