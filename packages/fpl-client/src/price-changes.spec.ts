import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { FplBootstrapStatic, FplPlayer, PriceChange } from '@simplyfpl/types';

import { formatPrice, predictPriceChanges } from './price-changes';

const feature = await loadFeature('./price-changes.feature');

function makePlayer(overrides: Partial<FplPlayer> = {}): FplPlayer {
  return {
    id: 1,
    web_name: 'Salah',
    first_name: 'Mohamed',
    second_name: 'Salah',
    team: 1,
    element_type: 3,
    now_cost: 135,
    total_points: 180,
    event_points: 12,
    selected_by_percent: '10.0',
    transfers_in_event: 0,
    transfers_out_event: 0,
    chance_of_playing_next_round: null,
    news: '',
    ...overrides,
  };
}

function makeBootstrap(players: FplPlayer[]): FplBootstrapStatic {
  return {
    elements: players,
    teams: [{ id: 1, name: 'Liverpool', short_name: 'LIV', code: 14 }],
    events: [],
    element_types: [],
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Format price from FPL tenths notation', ({ Given, When, Then }) => {
    let price: number;
    let result: string;

    Given('a price value of 55 in FPL tenths', () => {
      price = 55;
    });

    When('I format the price', () => {
      result = formatPrice(price);
    });

    Then('it should display as £5.5m', () => {
      expect(result).toBe('£5.5m');
    });
  });

  Scenario('Format price for a premium player', ({ Given, When, Then }) => {
    let price: number;
    let result: string;

    Given('a price value of 135 in FPL tenths', () => {
      price = 135;
    });

    When('I format the price', () => {
      result = formatPrice(price);
    });

    Then('it should display as £13.5m', () => {
      expect(result).toBe('£13.5m');
    });
  });

  Scenario('Player with strong net transfers is predicted to rise', ({ Given, When, Then }) => {
    let bootstrap: FplBootstrapStatic;
    let predictions: PriceChange[];

    Given('a player with 10 percent ownership and 200000 net transfers in this week', () => {
      bootstrap = makeBootstrap([
        makePlayer({
          selected_by_percent: '10.0',
          transfers_in_event: 200000,
          transfers_out_event: 0,
        }),
      ]);
    });

    When('I predict price changes', () => {
      predictions = predictPriceChanges(bootstrap);
    });

    Then('that player should be predicted to rise', () => {
      expect(predictions.length).toBeGreaterThan(0);
      expect(predictions[0]?.direction).toBe('rise');
    });
  });

  Scenario('Player with strong net transfers out is predicted to fall', ({ Given, When, Then }) => {
    let bootstrap: FplBootstrapStatic;
    let predictions: PriceChange[];

    Given('a player with 20 percent ownership and 400000 net transfers out this week', () => {
      bootstrap = makeBootstrap([
        makePlayer({
          id: 2,
          selected_by_percent: '20.0',
          transfers_in_event: 0,
          transfers_out_event: 400000,
        }),
      ]);
    });

    When('I predict price changes', () => {
      predictions = predictPriceChanges(bootstrap);
    });

    Then('that player should be predicted to fall', () => {
      expect(predictions.length).toBeGreaterThan(0);
      expect(predictions[0]?.direction).toBe('fall');
    });
  });

  Scenario('Unavailable player is excluded from predictions', ({ Given, When, Then }) => {
    let bootstrap: FplBootstrapStatic;
    let predictions: PriceChange[];

    Given('a player with chance of playing set to zero', () => {
      bootstrap = makeBootstrap([
        makePlayer({
          chance_of_playing_next_round: 0,
          transfers_in_event: 500000,
          transfers_out_event: 0,
        }),
      ]);
    });

    When('I predict price changes', () => {
      predictions = predictPriceChanges(bootstrap);
    });

    Then('that player should not appear in the predictions', () => {
      expect(predictions).toHaveLength(0);
    });
  });
});
