import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { FplBootstrapStatic, FplPlayer, FplTeam } from '@simplyfpl/types';

import type { DeadlineBrief } from './deadline-brief';
import { buildDeadlineBrief } from './deadline-brief';

const feature = await loadFeature('./deadline-brief.feature');

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
    selected_by_percent: '10.0',
    transfers_in_event: 0,
    transfers_out_event: 0,
    chance_of_playing_next_round: null,
    news: '',
    ...overrides,
  };
}

function makeBootstrap(players: FplPlayer[]): FplBootstrapStatic {
  return { elements: players, teams: [makeTeam()], events: [], element_types: [] };
}

let bootstrap: FplBootstrapStatic;
let brief: DeadlineBrief;

describeFeature(feature, ({ Scenario }) => {
  Scenario('A flagged starter is an open issue', ({ Given, When, Then }) => {
    Given('a bootstrap where a picked player is flagged at 50%', () => {
      bootstrap = makeBootstrap([makePlayer({ chance_of_playing_next_round: 50, news: 'Knock' })]);
    });

    When('buildDeadlineBrief is called', () => {
      brief = buildDeadlineBrief(bootstrap, new Set([1]));
    });

    Then('the brief lists one open issue and no good news', () => {
      expect(brief.openIssues).toHaveLength(1);
      expect(brief.openIssues[0]?.kind).toBe('doubt');
      expect(brief.goodNews).toHaveLength(0);
    });
  });

  Scenario('A predicted rise in the squad is good news, not an issue', ({ Given, When, Then }) => {
    Given('a bootstrap where a picked player has heavy net transfers in', () => {
      bootstrap = makeBootstrap([makePlayer({ transfers_in_event: 20_000 })]);
    });

    When('buildDeadlineBrief is called', () => {
      brief = buildDeadlineBrief(bootstrap, new Set([1]));
    });

    Then('the brief lists no open issues and one piece of good news', () => {
      expect(brief.openIssues).toHaveLength(0);
      expect(brief.goodNews).toHaveLength(1);
      expect(brief.goodNews[0]?.kind).toBe('price_rise');
    });
  });

  Scenario(
    'Game-wide price moves are counted even for players not picked',
    ({ Given, When, Then }) => {
      Given('a bootstrap where two non-picked players are rising and one is falling', () => {
        bootstrap = makeBootstrap([
          makePlayer(),
          makePlayer({ id: 2, web_name: 'Palmer', transfers_in_event: 20_000 }),
          makePlayer({ id: 3, web_name: 'Gordon', transfers_in_event: 20_000 }),
          makePlayer({ id: 4, web_name: 'Mbeumo', transfers_out_event: 20_000 }),
        ]);
      });

      When('buildDeadlineBrief is called', () => {
        brief = buildDeadlineBrief(bootstrap, new Set([1]));
      });

      Then('the brief counts 2 rises and 1 fall tonight', () => {
        expect(brief.risesTonight).toBe(2);
        expect(brief.fallsTonight).toBe(1);
        expect(brief.openIssues).toHaveLength(0);
      });
    }
  );

  Scenario(
    'Price moves below the probability threshold are not counted',
    ({ Given, When, Then }) => {
      Given('a bootstrap where a non-picked player has mild net transfers out', () => {
        bootstrap = makeBootstrap([
          makePlayer(),
          makePlayer({ id: 2, web_name: 'Mbeumo', transfers_out_event: 12_000 }),
        ]);
      });

      When('buildDeadlineBrief is called', () => {
        brief = buildDeadlineBrief(bootstrap, new Set([1]));
      });

      Then('the brief counts 0 rises and 0 falls tonight', () => {
        expect(brief.risesTonight).toBe(0);
        expect(brief.fallsTonight).toBe(0);
      });
    }
  );
});
