import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

import type { FplEntry, FplEntryLeague } from '@simplyfpl/types';

const MAX_CLASSIC_LEAGUES = 5;
const WORKER_URL = 'http://localhost:8787';

const ORIGINAL_FETCH = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;

function makeLeague(id: number, type: 'x' | 'c' | 's' = 'x'): FplEntryLeague {
  return {
    id,
    name: `League ${id}`,
    short_name: null,
    league_type: type,
    entry_rank: id,
  };
}

function makeEntry(entryId: number, leagues: FplEntryLeague[]): FplEntry {
  return {
    id: entryId,
    player_first_name: 'Test',
    player_last_name: 'User',
    name: `Team ${entryId}`,
    summary_overall_rank: 100000,
    summary_overall_points: 500,
    summary_event_rank: null,
    summary_event_points: 50,
    leagues: { classic: leagues, h2h: [] },
  };
}

async function fetchEntry(entryId: number): Promise<FplEntry> {
  const res = await fetch(`${WORKER_URL}/fpl/entry/${entryId}/`);
  if (!res.ok) throw new Error(`FPL API error: ${res.status} ${res.statusText}`);
  return (await res.json()) as FplEntry;
}

const feature = await loadFeature('./leagues-view.feature');

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  BeforeEachScenario(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  AfterEachScenario(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  Scenario('System leagues are excluded from display', ({ Given, When, Then }) => {
    let leagues: FplEntryLeague[];
    let filtered: FplEntryLeague[];

    Given('a list of classic leagues including one with league_type s', () => {
      leagues = [makeLeague(1, 'x'), makeLeague(2, 's'), makeLeague(3, 'c')];
    });

    When('the leagues are filtered', () => {
      filtered = leagues.filter((l) => l.league_type !== 's');
    });

    Then('the system league is not in the result', () => {
      expect(filtered.every((l) => l.league_type !== 's')).toBe(true);
      expect(filtered).toHaveLength(2);
    });
  });

  Scenario('At most five leagues are shown', ({ Given, When, Then }) => {
    let leagues: FplEntryLeague[];
    let visible: FplEntryLeague[];

    Given('a manager belonging to 8 classic leagues', () => {
      leagues = Array.from({ length: 8 }, (_, i) => makeLeague(i + 1, 'x'));
    });

    When('the leagues are sliced to the display cap', () => {
      visible = leagues.filter((l) => l.league_type !== 's').slice(0, MAX_CLASSIC_LEAGUES);
    });

    Then('only 5 leagues appear', () => {
      expect(visible).toHaveLength(MAX_CLASSIC_LEAGUES);
    });
  });

  Scenario('Entry endpoint returns leagues for a valid team ID', ({ Given, When, Then }) => {
    let result: FplEntry;

    Given('the entry endpoint returns two classic leagues for team 42', () => {
      const entry = makeEntry(42, [makeLeague(10, 'x'), makeLeague(20, 'c')]);
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(entry), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    When('the entry is fetched for team 42', async () => {
      result = await fetchEntry(42);
    });

    Then('the response contains two classic leagues', () => {
      expect(result.leagues?.classic).toHaveLength(2);
    });
  });

  Scenario('Entry endpoint error is surfaced as a thrown error', ({ Given, When, Then }) => {
    let error: Error | null = null;

    Given('the entry endpoint returns a 404 for team 99', () => {
      fetchMock.mockResolvedValue(new Response('Not Found', { status: 404 }));
    });

    When('the entry is fetched for team 99', async () => {
      try {
        await fetchEntry(99);
      } catch (e) {
        error = e as Error;
      }
    });

    Then('an error is thrown containing 404', () => {
      expect(error).not.toBeNull();
      expect(error?.message).toContain('404');
    });
  });
});
