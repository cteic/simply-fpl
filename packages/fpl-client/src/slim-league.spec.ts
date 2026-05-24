import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { FplLeague } from '@simplyfpl/types';

import { buildSlimLeague } from './slim-league';

const feature = await loadFeature('./slim-league.feature');

function makeRawLeague(): FplLeague {
  const rawMeta: FplLeague['league'] & Record<string, unknown> = {
    id: 314,
    name: 'Overall',
    created: '2025-07-01T00:00:00Z',
    closed: false,
    max_entries: null,
    league_type: 'x',
    scoring: 'c',
    admin_entry: null,
    start_event: 1,
    code_privacy: 'p',
    has_cup: true,
    cup_league: null,
    rank: null,
  };
  const raw: FplLeague & Record<string, unknown> = {
    new_entries: { has_next: false, page: 1, results: [{ entry: 99, joined_time: 'x' }] },
    last_updated_data: '2026-01-01T12:00:00Z',
    league: rawMeta,
    standings: {
      has_next: true,
      page: 1,
      results: [
        {
          id: 1,
          event_total: 52,
          player_name: 'Test Manager',
          rank: 1,
          last_rank: 2,
          rank_sort: 1,
          total: 800,
          entry: 12345,
          entry_name: 'Test FC',
        },
      ],
    },
  };
  return raw;
}

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'Slim league keeps the standings the rivals view renders',
    ({ Given, When, Then, And }) => {
      let raw: FplLeague;
      let slim: FplLeague;

      Given('a raw classic-league standings response', () => {
        raw = makeRawLeague();
      });

      When('the worker slims the league', () => {
        slim = buildSlimLeague(raw);
      });

      Then('the league name and standings results are preserved', () => {
        expect(slim.league.name).toBe('Overall');
        expect(slim.standings.has_next).toBe(true);
        expect(slim.standings.page).toBe(1);
        const row = slim.standings.results[0];
        expect(row?.rank).toBe(1);
        expect(row?.entry).toBe(12345);
        expect(row?.entry_name).toBe('Test FC');
        expect(row?.player_name).toBe('Test Manager');
        expect(row?.total).toBe(800);
        expect(row?.event_total).toBe(52);
      });

      And('the new_entries block and league metadata are dropped', () => {
        const topKeys = Object.keys(slim);
        expect(topKeys).not.toContain('new_entries');
        expect(topKeys).not.toContain('last_updated_data');
        const leagueKeys = Object.keys(slim.league);
        expect(leagueKeys).not.toContain('has_cup');
        expect(leagueKeys).not.toContain('code_privacy');
      });
    }
  );
});
