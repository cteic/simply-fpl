import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type {
  FplBootstrapStatic,
  FplElementType,
  FplEvent,
  FplPlayer,
  FplTeam,
} from '@simplyfpl/types';

import { buildSlimBootstrap } from './slim-bootstrap';

const feature = await loadFeature('./slim-bootstrap.feature');

const ELEMENT_FIELDS = [
  'id',
  'web_name',
  'first_name',
  'second_name',
  'team',
  'element_type',
  'now_cost',
  'total_points',
  'event_points',
  'selected_by_percent',
  'transfers_in_event',
  'transfers_out_event',
  'chance_of_playing_next_round',
  'news',
];

function makeRawBootstrap(): FplBootstrapStatic {
  const rawElement: FplPlayer & Record<string, unknown> = {
    id: 1,
    web_name: 'Salah',
    first_name: 'Mohamed',
    second_name: 'Salah',
    team: 1,
    element_type: 3,
    now_cost: 135,
    total_points: 180,
    event_points: 12,
    selected_by_percent: '45.0',
    transfers_in_event: 500_000,
    transfers_out_event: 50_000,
    chance_of_playing_next_round: 75,
    news: 'Knock - 75% chance of playing',
    ict_index: '180.5',
    expected_goals: '12.34',
    photo: '118748.jpg',
    form: '8.2',
    influence: '900.0',
  };
  const rawTeam: FplTeam & Record<string, unknown> = {
    id: 1,
    name: 'Liverpool',
    short_name: 'LIV',
    code: 14,
    strength: 5,
  };
  const rawEvent: FplEvent & Record<string, unknown> = {
    id: 1,
    name: 'Gameweek 1',
    deadline_time: '2025-08-15T17:30:00Z',
    is_current: true,
    is_next: false,
    is_previous: false,
    average_entry_score: 52,
    highest_score: 121,
    finished: false,
    chip_plays: [{ chip_name: 'bboost', num_played: 100 }],
  };
  const rawType: FplElementType & Record<string, unknown> = {
    id: 1,
    plural_name: 'Goalkeepers',
    plural_name_short: 'GKP',
    singular_name: 'Goalkeeper',
    singular_name_short: 'GKP',
    squad_select: 2,
  };
  return {
    elements: [rawElement],
    teams: [rawTeam],
    events: [rawEvent],
    element_types: [rawType],
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Slim bootstrap keeps only the rendered fields', ({ Given, When, Then, And }) => {
    let raw: FplBootstrapStatic;
    let slim: FplBootstrapStatic;

    Given('a raw bootstrap with heavy upstream-only fields', () => {
      raw = makeRawBootstrap();
    });

    When('the worker slims the bootstrap', () => {
      slim = buildSlimBootstrap(raw);
    });

    Then('each element exposes exactly the declared FplPlayer fields', () => {
      const element = slim.elements[0];
      expect(element).toBeDefined();
      expect(Object.keys(element ?? {}).sort()).toEqual([...ELEMENT_FIELDS].sort());
    });

    And('rendered element fields keep their real values', () => {
      const element = slim.elements[0];
      expect(element?.id).toBe(1);
      expect(element?.web_name).toBe('Salah');
      expect(element?.team).toBe(1);
      expect(element?.element_type).toBe(3);
      expect(element?.now_cost).toBe(135);
      expect(element?.event_points).toBe(12);
      expect(element?.selected_by_percent).toBe('45.0');
      expect(element?.chance_of_playing_next_round).toBe(75);
    });

    And('unread element fields are blanked', () => {
      const element = slim.elements[0];
      expect(element?.first_name).toBe('');
      expect(element?.second_name).toBe('');
      expect(element?.total_points).toBe(0);
      expect(element?.transfers_in_event).toBe(0);
      expect(element?.transfers_out_event).toBe(0);
      expect(element?.news).toBe('');
    });

    And('heavy upstream-only fields are dropped from elements', () => {
      const keys = Object.keys(slim.elements[0] ?? {});
      expect(keys).not.toContain('ict_index');
      expect(keys).not.toContain('expected_goals');
      expect(keys).not.toContain('photo');
      expect(keys).not.toContain('form');
    });

    And('teams, events and element types keep their declared fields only', () => {
      expect(Object.keys(slim.teams[0] ?? {}).sort()).toEqual(
        ['id', 'name', 'short_name', 'code'].sort()
      );
      expect(Object.keys(slim.teams[0] ?? {})).not.toContain('strength');
      const event = slim.events[0];
      expect(event?.deadline_time).toBe('2025-08-15T17:30:00Z');
      expect(event?.is_current).toBe(true);
      expect(Object.keys(slim.events[0] ?? {})).not.toContain('chip_plays');
      expect(Object.keys(slim.element_types[0] ?? {})).not.toContain('squad_select');
    });
  });
});
