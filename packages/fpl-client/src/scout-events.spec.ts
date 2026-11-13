import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { FplBootstrapStatic, FplPlayer, FplTeam, ScoutEvent } from '@simplyfpl/types';

import { deriveScoutEvents } from './scout-events';

const feature = await loadFeature('./scout-events.feature');

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

function makeBootstrap(players: FplPlayer[], teams: FplTeam[] = [makeTeam()]): FplBootstrapStatic {
  return { elements: players, teams, events: [], element_types: [] };
}

let bootstrap: FplBootstrapStatic;
let picks: Set<number>;
let events: ScoutEvent[] = [];

describeFeature(feature, ({ Scenario, BeforeEachScenario }) => {
  BeforeEachScenario(() => {
    picks = new Set([1]);
    events = [];
  });

  Scenario('Injured picked player yields a bad injury event', ({ Given, When, Then }) => {
    Given('a bootstrap where a picked player has FPL status "i"', () => {
      bootstrap = makeBootstrap([
        makePlayer({ status: 'i', news: 'Hamstring - Expected back 01 Jan' }),
      ]);
    });

    When('deriveScoutEvents is called', () => {
      events = deriveScoutEvents(bootstrap, picks);
    });

    Then('one event of kind "injury" with severity "bad" is returned', () => {
      expect(events).toHaveLength(1);
      expect(events[0]?.kind).toBe('injury');
      expect(events[0]?.severity).toBe('bad');
      expect(events[0]?.player.webName).toBe('Saka');
    });
  });

  Scenario('Doubtful picked player yields a warn doubt event', ({ Given, When, Then, And }) => {
    Given('a bootstrap where a picked player has a 50% chance of playing', () => {
      bootstrap = makeBootstrap([
        makePlayer({ chance_of_playing_next_round: 50, news: 'Knock - 50% chance of playing' }),
      ]);
    });

    When('deriveScoutEvents is called', () => {
      events = deriveScoutEvents(bootstrap, picks);
    });

    Then('one event of kind "doubt" with severity "warn" is returned', () => {
      expect(events).toHaveLength(1);
      expect(events[0]?.kind).toBe('doubt');
      expect(events[0]?.severity).toBe('warn');
    });

    And('the event carries the chance of playing and the news string', () => {
      expect(events[0]?.chanceOfPlaying).toBe(50);
      expect(events[0]?.news).toBe('Knock - 50% chance of playing');
    });
  });

  Scenario('Availability news for a non-picked player is excluded', ({ Given, When, Then }) => {
    Given('a bootstrap where only a non-picked player has news', () => {
      bootstrap = makeBootstrap([
        makePlayer(),
        makePlayer({ id: 2, web_name: 'Havertz', status: 'i', news: 'Ankle injury' }),
      ]);
    });

    When('deriveScoutEvents is called', () => {
      events = deriveScoutEvents(bootstrap, picks);
    });

    Then('no events are returned', () => {
      expect(events).toHaveLength(0);
    });
  });

  Scenario(
    'Predicted fall on a picked player yields a warn price event',
    ({ Given, When, Then, And }) => {
      Given('a bootstrap where a picked player has heavy net transfers out', () => {
        bootstrap = makeBootstrap([makePlayer({ transfers_out_event: 20_000 })]);
      });

      When('deriveScoutEvents is called', () => {
        events = deriveScoutEvents(bootstrap, picks);
      });

      Then('one event of kind "price_fall" with severity "warn" is returned', () => {
        expect(events).toHaveLength(1);
        expect(events[0]?.kind).toBe('price_fall');
        expect(events[0]?.severity).toBe('warn');
      });

      And('the event carries a probability and net transfers', () => {
        expect(events[0]?.probability).toBeGreaterThanOrEqual(0.5);
        expect(events[0]?.netTransfers).toBe(-20_000);
      });
    }
  );

  Scenario(
    'Predicted fall below the probability threshold is excluded',
    ({ Given, When, Then }) => {
      Given('a bootstrap where a picked player has mild net transfers out', () => {
        bootstrap = makeBootstrap([makePlayer({ transfers_out_event: 12_000 })]);
      });

      When('deriveScoutEvents is called', () => {
        events = deriveScoutEvents(bootstrap, picks);
      });

      Then('no events are returned', () => {
        expect(events).toHaveLength(0);
      });
    }
  );

  Scenario(
    'Predicted rise on a picked player yields a good price event',
    ({ Given, When, Then }) => {
      Given('a bootstrap where a picked player has heavy net transfers in', () => {
        bootstrap = makeBootstrap([makePlayer({ transfers_in_event: 20_000 })]);
      });

      When('deriveScoutEvents is called', () => {
        events = deriveScoutEvents(bootstrap, picks);
      });

      Then('one event of kind "price_rise" with severity "good" is returned', () => {
        expect(events).toHaveLength(1);
        expect(events[0]?.kind).toBe('price_rise');
        expect(events[0]?.severity).toBe('good');
      });
    }
  );

  Scenario('Price prediction for a non-picked player is excluded', ({ Given, When, Then }) => {
    Given('a bootstrap where only a non-picked player has heavy net transfers out', () => {
      bootstrap = makeBootstrap([
        makePlayer(),
        makePlayer({ id: 2, web_name: 'Havertz', transfers_out_event: 20_000 }),
      ]);
    });

    When('deriveScoutEvents is called', () => {
      events = deriveScoutEvents(bootstrap, picks);
    });

    Then('no events are returned', () => {
      expect(events).toHaveLength(0);
    });
  });

  Scenario('Events are ordered bad, then warn, then good', ({ Given, When, Then }) => {
    Given('a bootstrap with an injured pick, a doubtful pick and a rising pick', () => {
      picks = new Set([1, 2, 3]);
      bootstrap = makeBootstrap([
        makePlayer({ id: 3, web_name: 'Gordon', transfers_in_event: 20_000 }),
        makePlayer({ id: 2, web_name: 'Palmer', chance_of_playing_next_round: 75, news: 'Knock' }),
        makePlayer({ id: 1, web_name: 'Isak', status: 'i', news: 'Ankle injury' }),
      ]);
    });

    When('deriveScoutEvents is called', () => {
      events = deriveScoutEvents(bootstrap, picks);
    });

    Then('the events are ordered injury, doubt, price_rise', () => {
      expect(events.map((e) => e.kind)).toEqual(['injury', 'doubt', 'price_rise']);
    });
  });

  Scenario(
    'A player can appear in both an availability and a price event',
    ({ Given, When, Then }) => {
      Given('a bootstrap where a picked player is doubtful and falling in price', () => {
        bootstrap = makeBootstrap([
          makePlayer({
            chance_of_playing_next_round: 50,
            news: 'Knock - 50% chance of playing',
            transfers_out_event: 20_000,
          }),
        ]);
      });

      When('deriveScoutEvents is called', () => {
        events = deriveScoutEvents(bootstrap, picks);
      });

      Then('two events are returned for that player', () => {
        expect(events).toHaveLength(2);
        expect(events.map((e) => e.kind).sort()).toEqual(['doubt', 'price_fall']);
        expect(events.every((e) => e.player.id === 1)).toBe(true);
      });
    }
  );
});
