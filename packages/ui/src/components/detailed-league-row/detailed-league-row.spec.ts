import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { DetailedLeagueRowData } from '@simplyfpl/types';

import { buildDetailedLeagueRowView, toggleExpanded } from './detailed-league-row-state';
import type { DetailedLeagueRowView } from './detailed-league-row-state';

const feature = await loadFeature(
  './src/components/detailed-league-row/detailed-league-row.feature'
);

function baseRow(overrides: Partial<DetailedLeagueRowData> = {}): DetailedLeagueRowData {
  return {
    position: 1,
    managerName: 'Test Manager',
    teamName: 'Test Team',
    entryId: 1,
    overallRank: 1000,
    gwPoints: 60,
    transferHits: 0,
    totalPoints: 1500,
    captain: null,
    benchPointsWasted: 0,
    activeChip: null,
    transfersOut: [],
    transfersIn: [],
    playersPlayed: 11,
    playersTotal: 11,
    ...overrides,
  };
}

describeFeature(feature, (f) => {
  f.Scenario(
    'Tapping a collapsed row expands it, tapping again collapses it',
    ({ Given, When, Then }) => {
      let expanded = false;

      Given('a collapsed detailed league row', () => {
        expanded = false;
      });
      When('the row is toggled', () => {
        expanded = toggleExpanded(expanded);
      });
      Then('the row is expanded', () => {
        expect(expanded).toBe(true);
      });
      When('the expanded row is toggled', () => {
        expanded = toggleExpanded(expanded);
      });
      Then('the row is collapsed', () => {
        expect(expanded).toBe(false);
      });
    }
  );

  f.Scenario(
    'Bench waste line is shown when bench points are non-zero',
    ({ Given, When, Then }) => {
      let row: DetailedLeagueRowData;
      let view: DetailedLeagueRowView;

      Given('a row where 12 bench points were wasted', () => {
        row = baseRow({ benchPointsWasted: 12 });
      });
      When('the row view is built', () => {
        view = buildDetailedLeagueRowView(row);
      });
      Then('the bench waste line reads "12 pts wasted"', () => {
        expect(view.benchWaste).toBe('12 pts wasted');
      });
    }
  );

  f.Scenario(
    'Bench waste line is hidden when no bench points were wasted',
    ({ Given, When, Then }) => {
      let row: DetailedLeagueRowData;
      let view: DetailedLeagueRowView;

      Given('a row where no bench points were wasted', () => {
        row = baseRow({ benchPointsWasted: 0 });
      });
      When('the row view is built', () => {
        view = buildDetailedLeagueRowView(row);
      });
      Then('the bench waste line is hidden', () => {
        expect(view.benchWaste).toBeNull();
      });
    }
  );

  f.Scenario("The user's own row is highlighted", ({ Given, When, Then }) => {
    let row: DetailedLeagueRowData;
    let view: DetailedLeagueRowView;

    Given('a row that belongs to the user', () => {
      row = baseRow({ isYou: true });
    });
    When('the row view is built', () => {
      view = buildDetailedLeagueRowView(row);
    });
    Then('the row is highlighted', () => {
      expect(view.highlighted).toBe(true);
    });
  });

  f.Scenario("A rival's row is not highlighted", ({ Given, When, Then }) => {
    let row: DetailedLeagueRowData;
    let view: DetailedLeagueRowView;

    Given('a row that belongs to a rival', () => {
      row = baseRow({ isYou: false });
    });
    When('the row view is built', () => {
      view = buildDetailedLeagueRowView(row);
    });
    Then('the row is not highlighted', () => {
      expect(view.highlighted).toBe(false);
    });
  });

  f.Scenario('Captain cell shows name with multiplier-adjusted points', ({ Given, When, Then }) => {
    let row: DetailedLeagueRowData;
    let view: DetailedLeagueRowView;

    Given('a row captained by Palmer scoring 14 with a triple-captain chip', () => {
      row = baseRow({ captain: { name: 'Palmer', points: 14, multiplier: 3 } });
    });
    When('the row view is built', () => {
      view = buildDetailedLeagueRowView(row);
    });
    Then('the captain cell reads "Palmer (TC) · 42"', () => {
      expect(view.captainLabel).toBe('Palmer (TC) · 42');
    });
  });

  f.Scenario(
    'Transfers read out and in without strikethrough and surface the hit',
    ({ Given, When, Then, And }) => {
      let row: DetailedLeagueRowData;
      let view: DetailedLeagueRowView;

      Given('a row that moved out Bowen and in Welbeck for a 4 point hit', () => {
        row = baseRow({
          transfersOut: ['Bowen'],
          transfersIn: ['Welbeck'],
          transferHits: 4,
        });
      });
      When('the row view is built', () => {
        view = buildDetailedLeagueRowView(row);
      });
      Then('the transfer summary out reads "Bowen"', () => {
        expect(view.transferSummary?.out).toBe('Bowen');
      });
      And('the transfer summary in reads "Welbeck"', () => {
        expect(view.transferSummary?.in).toBe('Welbeck');
      });
      And('the transfer hit reads "-4"', () => {
        expect(view.transferSummary?.hitLabel).toBe('-4');
      });
    }
  );
});
