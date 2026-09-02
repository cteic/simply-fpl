import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { FplLeague, FplLeagueStanding } from '@simplyfpl/types';

import type { LeaguePress } from './league-press';
import { buildLeaguePress } from './league-press';

const feature = await loadFeature('./league-press.feature');

function makeStanding(overrides: Partial<FplLeagueStanding> = {}): FplLeagueStanding {
  return {
    id: 1,
    entry: 1,
    entry_name: 'GW King FC',
    player_name: "James O'Brien",
    rank: 1,
    last_rank: 1,
    rank_sort: 1,
    total: 1000,
    event_total: 60,
    ...overrides,
  };
}

function makeLeague(results: FplLeagueStanding[], hasNext = false): FplLeague {
  return {
    league: {
      id: 99,
      name: 'The Gibbingtons',
      created: '2026-08-01T00:00:00Z',
      admin_entry: null,
      start_event: 1,
      league_type: 'c',
    },
    standings: { has_next: hasNext, page: 1, results },
  };
}

function closeLeague(): FplLeague {
  return makeLeague([
    makeStanding({ id: 1, entry: 1, entry_name: 'GW King FC', rank: 1, total: 1000 }),
    makeStanding({ id: 2, entry: 2, entry_name: 'Saka Boom', rank: 2, total: 997 }),
    makeStanding({ id: 3, entry: 3, entry_name: 'Palmer FC', rank: 3, total: 950 }),
  ]);
}

let league: FplLeague;
let press: LeaguePress | null = null;

describeFeature(feature, ({ Scenario }) => {
  Scenario('The leader and chaser gap are derived from the standings', ({ Given, When, Then }) => {
    Given('a league where GW King FC lead Saka Boom by 3 points', () => {
      league = closeLeague();
    });

    When('buildLeaguePress is called', () => {
      press = buildLeaguePress(league, null);
    });

    Then('the leader is "GW King FC" and the chaser gap is 3', () => {
      expect(press?.leader.entryName).toBe('GW King FC');
      expect(press?.chaser?.entryName).toBe('Saka Boom');
      expect(press?.chaser?.gap).toBe(3);
    });
  });

  Scenario('A close gap at the top makes it a rivalry week', ({ Given, When, Then }) => {
    Given('a league where GW King FC lead Saka Boom by 3 points', () => {
      league = closeLeague();
    });

    When('buildLeaguePress is called', () => {
      press = buildLeaguePress(league, null);
    });

    Then('it is a rivalry week', () => {
      expect(press?.isRivalryWeek).toBe(true);
    });
  });

  Scenario('A wide gap at the top is not a rivalry week', ({ Given, When, Then }) => {
    Given('a league where the leader is 40 points clear', () => {
      league = makeLeague([
        makeStanding({ id: 1, entry: 1, rank: 1, total: 1000 }),
        makeStanding({ id: 2, entry: 2, entry_name: 'Saka Boom', rank: 2, total: 960 }),
      ]);
    });

    When('buildLeaguePress is called', () => {
      press = buildLeaguePress(league, null);
    });

    Then('it is not a rivalry week', () => {
      expect(press?.isRivalryWeek).toBe(false);
    });
  });

  Scenario('Top score and sack watch come from the gameweek totals', ({ Given, When, Then }) => {
    Given('a league of four with distinct gameweek scores', () => {
      league = makeLeague([
        makeStanding({ id: 1, entry: 1, entry_name: 'GW King FC', rank: 1, event_total: 60 }),
        makeStanding({ id: 2, entry: 2, entry_name: 'Saka Boom', rank: 2, event_total: 89 }),
        makeStanding({ id: 3, entry: 3, entry_name: 'Palmer FC', rank: 3, event_total: 31 }),
        makeStanding({ id: 4, entry: 4, entry_name: 'Wissa Business', rank: 4, event_total: 54 }),
      ]);
    });

    When('buildLeaguePress is called', () => {
      press = buildLeaguePress(league, null);
    });

    Then('the top score names the best gameweek and sack watch names the worst', () => {
      expect(press?.topScore?.entryName).toBe('Saka Boom');
      expect(press?.topScore?.eventTotal).toBe(89);
      expect(press?.sackWatch?.entryName).toBe('Palmer FC');
      expect(press?.sackWatch?.eventTotal).toBe(31);
    });
  });

  Scenario('Sack watch is suppressed in a two-manager league', ({ Given, When, Then }) => {
    Given('a league with only two managers', () => {
      league = makeLeague([
        makeStanding({ id: 1, entry: 1, rank: 1 }),
        makeStanding({ id: 2, entry: 2, entry_name: 'Saka Boom', rank: 2, event_total: 20 }),
      ]);
    });

    When('buildLeaguePress is called', () => {
      press = buildLeaguePress(league, null);
    });

    Then('there is no sack watch', () => {
      expect(press?.sackWatch).toBeNull();
    });
  });

  Scenario('The biggest climb picks the largest rank gain', ({ Given, When, Then }) => {
    Given('a league where one manager climbed four places', () => {
      league = makeLeague([
        makeStanding({ id: 1, entry: 1, rank: 1, last_rank: 2 }),
        makeStanding({ id: 2, entry: 2, entry_name: 'Saka Boom', rank: 2, last_rank: 6 }),
        makeStanding({ id: 3, entry: 3, entry_name: 'Palmer FC', rank: 3, last_rank: 1 }),
      ]);
    });

    When('buildLeaguePress is called', () => {
      press = buildLeaguePress(league, null);
    });

    Then('the biggest climb is that manager with 4 places', () => {
      expect(press?.biggestClimb?.entryName).toBe('Saka Boom');
      expect(press?.biggestClimb?.places).toBe(4);
    });
  });

  Scenario('Your rank is reported when your entry is in the league', ({ Given, When, Then }) => {
    Given('a league where entry 42 sits second', () => {
      league = makeLeague([
        makeStanding({ id: 1, entry: 1, rank: 1 }),
        makeStanding({ id: 2, entry: 42, entry_name: 'Peter’s United', rank: 2 }),
        makeStanding({ id: 3, entry: 3, entry_name: 'Palmer FC', rank: 3 }),
      ]);
    });

    When('buildLeaguePress is called for entry 42', () => {
      press = buildLeaguePress(league, 42);
    });

    Then('your rank is 2', () => {
      expect(press?.yourRank).toBe(2);
    });
  });

  Scenario('A paginated league suppresses week-wide beats', ({ Given, When, Then }) => {
    Given('a league whose standings continue onto another page', () => {
      league = makeLeague(
        [
          makeStanding({ id: 1, entry: 1, rank: 1, last_rank: 3, event_total: 80 }),
          makeStanding({ id: 2, entry: 2, entry_name: 'Saka Boom', rank: 2, event_total: 20 }),
          makeStanding({ id: 3, entry: 3, entry_name: 'Palmer FC', rank: 3, event_total: 50 }),
        ],
        true
      );
    });

    When('buildLeaguePress is called', () => {
      press = buildLeaguePress(league, null);
    });

    Then('top score, sack watch and biggest climb are absent', () => {
      expect(press?.complete).toBe(false);
      expect(press?.topScore).toBeNull();
      expect(press?.sackWatch).toBeNull();
      expect(press?.biggestClimb).toBeNull();
      expect(press?.leader.entryName).toBe('GW King FC');
    });
  });

  Scenario('An empty standings page yields no press', ({ Given, When, Then }) => {
    Given('a league with no standings results', () => {
      league = makeLeague([]);
    });

    When('buildLeaguePress is called', () => {
      press = buildLeaguePress(league, null);
    });

    Then('no press is returned', () => {
      expect(press).toBeNull();
    });
  });
});
