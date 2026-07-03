import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { FplBootstrapStatic, FplPlayer, FplTeam, TeamNewsGroup } from '@simplyfpl/types';

import { collateTeamNews, filterNewsForPicks } from './news';

const feature = await loadFeature('./news.feature');

function makeTeam(overrides: Partial<FplTeam> = {}): FplTeam {
  return { id: 1, name: 'Arsenal', short_name: 'ARS', code: 3, ...overrides };
}

function makePlayer(overrides: Partial<FplPlayer> = {}): FplPlayer {
  return {
    id: 1,
    web_name: 'Saka',
    first_name: 'Bukayo',
    second_name: 'Saka',
    team: 1,
    element_type: 3,
    now_cost: 90,
    total_points: 120,
    event_points: 6,
    selected_by_percent: '30.0',
    transfers_in_event: 50_000,
    transfers_out_event: 10_000,
    chance_of_playing_next_round: null,
    news: '',
    ...overrides,
  };
}

function makeBootstrap(players: FplPlayer[], teams: FplTeam[]): FplBootstrapStatic {
  return { elements: players, teams, events: [], element_types: [] };
}

let lastGroups: TeamNewsGroup[] = [];

describeFeature(feature, ({ Scenario }) => {
  Scenario('Player with doubt chance-of-playing is included', ({ Given, When, Then }) => {
    let bootstrap: FplBootstrapStatic;

    Given('a bootstrap with a player who has a 75% chance of playing next round', () => {
      bootstrap = makeBootstrap(
        [makePlayer({ chance_of_playing_next_round: 75, news: 'Knock - 75%' })],
        [makeTeam()]
      );
    });

    When('collateTeamNews is called', () => {
      lastGroups = collateTeamNews(bootstrap);
    });

    Then('the player appears in their team\'s group with status "doubt"', () => {
      expect(lastGroups).toHaveLength(1);
      expect(lastGroups[0]?.players[0]?.status).toBe('doubt');
    });
  });

  Scenario('Fully available player with no news is excluded', ({ Given, When, Then }) => {
    let bootstrap: FplBootstrapStatic;

    Given('a bootstrap with a player who has no news and a null chance-of-playing', () => {
      bootstrap = makeBootstrap([makePlayer()], [makeTeam()]);
    });

    When('collateTeamNews is called', () => {
      lastGroups = collateTeamNews(bootstrap);
    });

    Then('no team groups are returned', () => {
      expect(lastGroups).toHaveLength(0);
    });
  });

  Scenario('Player with suspended status is included', ({ Given, When, Then }) => {
    let bootstrap: FplBootstrapStatic;

    Given('a bootstrap with a player whose FPL status field is "s"', () => {
      bootstrap = makeBootstrap(
        [makePlayer({ status: 's', news: 'Suspended for 1 match' })],
        [makeTeam()]
      );
    });

    When('collateTeamNews is called', () => {
      lastGroups = collateTeamNews(bootstrap);
    });

    Then('the player appears with status "suspended"', () => {
      expect(lastGroups[0]?.players[0]?.status).toBe('suspended');
    });
  });

  Scenario('Player with injured status is included', ({ Given, When, Then }) => {
    let bootstrap: FplBootstrapStatic;

    Given('a bootstrap with a player whose FPL status field is "i"', () => {
      bootstrap = makeBootstrap(
        [
          makePlayer({
            status: 'i',
            news: 'Hamstring - Expected back 01 Jan',
            chance_of_playing_next_round: 0,
          }),
        ],
        [makeTeam()]
      );
    });

    When('collateTeamNews is called', () => {
      lastGroups = collateTeamNews(bootstrap);
    });

    Then('the player appears with status "injured"', () => {
      expect(lastGroups[0]?.players[0]?.status).toBe('injured');
    });
  });

  Scenario(
    'Player with zero chance-of-playing and no status falls back to injured',
    ({ Given, When, Then }) => {
      let bootstrap: FplBootstrapStatic;

      Given('a bootstrap with a player whose chance-of-playing is 0 and status is absent', () => {
        bootstrap = makeBootstrap(
          [makePlayer({ chance_of_playing_next_round: 0, news: 'Injury - doubtful' })],
          [makeTeam()]
        );
      });

      When('collateTeamNews is called', () => {
        lastGroups = collateTeamNews(bootstrap);
      });

      Then('the player appears with status "injured"', () => {
        expect(lastGroups[0]?.players[0]?.status).toBe('injured');
      });
    }
  );

  Scenario('Players from multiple teams are grouped by club', ({ Given, When, Then }) => {
    let bootstrap: FplBootstrapStatic;

    Given('a bootstrap with players from Arsenal and Chelsea both having news', () => {
      bootstrap = makeBootstrap(
        [
          makePlayer({ id: 1, team: 1, news: 'Knock', chance_of_playing_next_round: 75 }),
          makePlayer({ id: 2, team: 2, news: 'Suspended', status: 's' }),
        ],
        [
          makeTeam({ id: 1, name: 'Arsenal', short_name: 'ARS' }),
          makeTeam({ id: 2, name: 'Chelsea', short_name: 'CHE' }),
        ]
      );
    });

    When('collateTeamNews is called', () => {
      lastGroups = collateTeamNews(bootstrap);
    });

    Then('two team groups are returned sorted alphabetically by team name', () => {
      expect(lastGroups).toHaveLength(2);
      expect(lastGroups[0]?.team_name).toBe('Arsenal');
      expect(lastGroups[1]?.team_name).toBe('Chelsea');
    });
  });

  Scenario('filterNewsForPicks returns only squad players', ({ Given, When, Then }) => {
    let groups: TeamNewsGroup[];
    let result: ReturnType<typeof filterNewsForPicks>;

    Given('collated team news containing players from multiple clubs', () => {
      const bootstrap = makeBootstrap(
        [
          makePlayer({ id: 10, team: 1, news: 'Doubt', chance_of_playing_next_round: 50 }),
          makePlayer({ id: 20, team: 2, news: 'Suspended', status: 's' }),
        ],
        [
          makeTeam({ id: 1, name: 'Arsenal', short_name: 'ARS' }),
          makeTeam({ id: 2, name: 'Chelsea', short_name: 'CHE' }),
        ]
      );
      groups = collateTeamNews(bootstrap);
    });

    When("filterNewsForPicks is called with a set containing only one player's id", () => {
      result = filterNewsForPicks(groups, new Set([10]));
    });

    Then('only that player is returned', () => {
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(10);
    });
  });
});
