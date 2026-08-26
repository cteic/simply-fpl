import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { ScoutEvent } from '@simplyfpl/types';

import type { ScoutRowModel } from './scout-rows';
import { buildScoutRow } from './scout-rows';

const feature = await loadFeature('./scout-view.feature');

function makeEvent(overrides: Partial<ScoutEvent> = {}): ScoutEvent {
  return {
    id: 'injury-1',
    kind: 'injury',
    severity: 'bad',
    player: { id: 1, webName: 'Isak', teamShortName: 'NEW', elementType: 4, nowCost: 94 },
    news: null,
    chanceOfPlaying: null,
    probability: null,
    netTransfers: null,
    ...overrides,
  };
}

let event: ScoutEvent;
let row: ScoutRowModel;

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'An injury event renders a bad-tone row with an injury chip',
    ({ Given, When, Then, And }) => {
      Given('an injury scout event for Isak', () => {
        event = makeEvent({ news: 'Ankle injury - Expected back 26 Dec' });
      });

      When('the row model is built', () => {
        row = buildScoutRow(event);
      });

      Then('the row has tone "bad" and the injury chip', () => {
        expect(row.tone).toBe('bad');
        expect(row.chipLabel).toBe('Injury');
      });

      And('the title names Isak', () => {
        expect(row.title).toContain('Isak');
      });
    }
  );

  Scenario(
    'A doubt event carries chance of playing and news in the meta',
    ({ Given, When, Then }) => {
      Given('a doubt scout event for Palmer with a 50% chance and news text', () => {
        event = makeEvent({
          id: 'doubt-2',
          kind: 'doubt',
          severity: 'warn',
          player: { id: 2, webName: 'Palmer', teamShortName: 'CHE', elementType: 3, nowCost: 111 },
          news: 'Knock - 50% chance of playing',
          chanceOfPlaying: 50,
        });
      });

      When('the row model is built', () => {
        row = buildScoutRow(event);
      });

      Then('the meta line includes the chance of playing and the news text', () => {
        expect(row.meta).toContain('50%');
        expect(row.meta).toContain('Knock - 50% chance of playing');
      });
    }
  );

  Scenario(
    'A price fall event carries probability and net transfers',
    ({ Given, When, Then, And }) => {
      Given('a price fall scout event for Mbeumo with 87% probability', () => {
        event = makeEvent({
          id: 'price_fall-3',
          kind: 'price_fall',
          severity: 'warn',
          player: { id: 3, webName: 'Mbeumo', teamShortName: 'BRE', elementType: 3, nowCost: 78 },
          probability: 0.87,
          netTransfers: -96_113,
        });
      });

      When('the row model is built', () => {
        row = buildScoutRow(event);
      });

      Then('the row has tone "warn" and the title says a fall is predicted', () => {
        expect(row.tone).toBe('warn');
        expect(row.title).toContain('Mbeumo');
        expect(row.title.toLowerCase()).toContain('fall');
      });

      And('the meta line includes the probability and signed net transfers', () => {
        expect(row.meta).toContain('87%');
        expect(row.meta).toContain('−96,113');
      });
    }
  );

  Scenario('A price rise event renders a good-tone row', ({ Given, When, Then }) => {
    Given('a price rise scout event for Gordon', () => {
      event = makeEvent({
        id: 'price_rise-4',
        kind: 'price_rise',
        severity: 'good',
        player: { id: 4, webName: 'Gordon', teamShortName: 'NEW', elementType: 3, nowCost: 72 },
        probability: 0.61,
        netTransfers: 54_200,
      });
    });

    When('the row model is built', () => {
      row = buildScoutRow(event);
    });

    Then('the row has tone "good" and the price rise chip', () => {
      expect(row.tone).toBe('good');
      expect(row.chipLabel).toBe('Price rise');
    });
  });
});
