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

function findRow(changes: PriceChange[], webName: string): PriceChange | undefined {
  return changes.find((c) => c.player.web_name === webName);
}

/** Shapes taken from the live GW11 2026/27 bootstrap payload. */
function officialPlayers(): FplPlayer[] {
  return [
    makePlayer({
      id: 1,
      web_name: 'Riser',
      price_change_percent: '102.1',
      price_change_hourly_rate: 10_958,
      price_change_projections: [{ offset: 0, projected_percent: '123.4', likelihood: 5 }],
      price_change_locked_until: null,
      price_change_calibrating: false,
    }),
    makePlayer({
      id: 2,
      web_name: 'Faller',
      price_change_percent: '-98.4',
      price_change_hourly_rate: -12,
      price_change_projections: [{ offset: 0, projected_percent: '-99.1', likelihood: -4 }],
      price_change_locked_until: null,
      price_change_calibrating: false,
    }),
    makePlayer({
      id: 3,
      web_name: 'Drifter',
      price_change_percent: '24.8',
      price_change_hourly_rate: 105,
      price_change_projections: [{ offset: 0, projected_percent: '26.0', likelihood: 2 }],
      price_change_locked_until: null,
      price_change_calibrating: false,
    }),
    makePlayer({
      id: 4,
      web_name: 'Locked',
      price_change_percent: '55.9',
      price_change_hourly_rate: 83,
      price_change_projections: [{ offset: 0, projected_percent: '58.0', likelihood: 3 }],
      price_change_locked_until: '2026-11-29T21:00:06Z',
      price_change_calibrating: false,
    }),
    makePlayer({
      id: 5,
      web_name: 'Static',
      price_change_percent: '0.0',
      price_change_hourly_rate: 0,
      price_change_projections: [{ offset: 0, projected_percent: '0.0', likelihood: 0 }],
      price_change_locked_until: null,
      price_change_calibrating: false,
    }),
  ];
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

  Scenario("FPL's own figures drive direction and progress", ({ Given, When, Then, And }) => {
    let bootstrap: FplBootstrapStatic;
    let changes: PriceChange[];

    Given("a bootstrap carrying FPL's price-change fields", () => {
      bootstrap = makeBootstrap(officialPlayers());
    });

    When('I read the price changes', () => {
      changes = predictPriceChanges(bootstrap);
    });

    Then('the riser is marked as a rise and the faller as a fall', () => {
      expect(findRow(changes, 'Riser')?.direction).toBe('rise');
      expect(findRow(changes, 'Faller')?.direction).toBe('fall');
    });

    And("each row reports FPL's threshold progress", () => {
      expect(findRow(changes, 'Riser')?.progressPercent).toBeCloseTo(102.1, 1);
      // progress is unsigned; the sign lives in `direction`
      expect(findRow(changes, 'Faller')?.progressPercent).toBeCloseTo(98.4, 1);
    });

    And('each row carries the projection, hourly rate and lock state', () => {
      const riser = findRow(changes, 'Riser');
      expect(riser?.projectedPercent).toBeCloseTo(123.4, 1);
      expect(riser?.hourlyRate).toBe(10_958);
      expect(riser?.lockedUntil).toBeNull();
      expect(riser?.calibrating).toBe(false);
      expect(findRow(changes, 'Locked')?.lockedUntil).toBe('2026-11-29T21:00:06Z');
    });

    And('the rows are sourced from FPL', () => {
      for (const change of changes) expect(change.source).toBe('fpl-official');
    });
  });

  Scenario('The list is ordered by how close a change is', ({ Given, When, Then }) => {
    let bootstrap: FplBootstrapStatic;
    let changes: PriceChange[];

    Given("a bootstrap carrying FPL's price-change fields", () => {
      bootstrap = makeBootstrap(officialPlayers());
    });

    When('I read the price changes', () => {
      changes = predictPriceChanges(bootstrap);
    });

    Then('the player closest to a change comes first', () => {
      expect(changes[0]?.player.web_name).toBe('Riser');
      const progress = changes.map((c) => c.progressPercent);
      const descending = [...progress].sort((a, b) => b - a);
      expect(progress).toEqual(descending);
    });
  });

  Scenario('A player barely moving is left out', ({ Given, When, Then }) => {
    let bootstrap: FplBootstrapStatic;
    let changes: PriceChange[];

    Given("a bootstrap carrying FPL's price-change fields", () => {
      bootstrap = makeBootstrap(officialPlayers());
    });

    When('I read the price changes', () => {
      changes = predictPriceChanges(bootstrap);
    });

    Then('a player sitting at zero progress does not appear', () => {
      expect(findRow(changes, 'Static')).toBeUndefined();
    });
  });

  Scenario("Only FPL's own confidence reaches certainty", ({ Given, When, Then, And }) => {
    let bootstrap: FplBootstrapStatic;
    let changes: PriceChange[];

    Given("a bootstrap carrying FPL's price-change fields", () => {
      bootstrap = makeBootstrap(officialPlayers());
    });

    When('I read the price changes', () => {
      changes = predictPriceChanges(bootstrap);
    });

    Then('a likelihood of 5 reads as certain', () => {
      expect(findRow(changes, 'Riser')?.probability).toBe(1);
    });

    And('a likelihood of 2 does not', () => {
      expect(findRow(changes, 'Drifter')?.probability).toBeCloseTo(0.4, 5);
    });
  });

  Scenario(
    'Payloads without the official fields fall back to net transfers',
    ({ Given, When, Then, And }) => {
      let bootstrap: FplBootstrapStatic;
      let changes: PriceChange[];

      Given('a bootstrap with no price-change fields and heavy net transfers in', () => {
        bootstrap = makeBootstrap([
          makePlayer({
            web_name: 'Legacy',
            selected_by_percent: '10.0',
            transfers_in_event: 400_000,
            transfers_out_event: 0,
          }),
        ]);
        bootstrap.total_players = 11_332_858;
      });

      When('I read the price changes', () => {
        changes = predictPriceChanges(bootstrap);
      });

      Then('that player is still predicted to rise', () => {
        expect(findRow(changes, 'Legacy')?.direction).toBe('rise');
      });

      And('the row is marked as an estimate rather than official', () => {
        expect(findRow(changes, 'Legacy')?.source).toBe('net-transfer-estimate');
      });
    }
  );

  Scenario(
    'The fallback never claims certainty it cannot support',
    ({ Given, When, Then, And }) => {
      let bootstrap: FplBootstrapStatic;
      let changes: PriceChange[];

      Given('a bootstrap with no price-change fields and twenty mildly traded players', () => {
        const players = Array.from({ length: 20 }, (_unused, i) =>
          makePlayer({
            id: i + 1,
            web_name: `Mild${i}`,
            selected_by_percent: '10.0',
            transfers_in_event: 20_000 + i * 2_000,
            transfers_out_event: 0,
          })
        );
        bootstrap = makeBootstrap(players);
        bootstrap.total_players = 11_332_858;
      });

      When('I read the price changes', () => {
        changes = predictPriceChanges(bootstrap);
      });

      Then('no row claims certainty', () => {
        expect(changes.length).toBeGreaterThan(0);
        expect(changes.filter((c) => c.probability > 0)).toHaveLength(0);
      });

      And('every row is flagged as still calibrating', () => {
        for (const change of changes) expect(change.calibrating).toBe(true);
      });
    }
  );
});
