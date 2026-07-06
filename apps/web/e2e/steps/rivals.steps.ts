import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

const WORKER_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';
const STORAGE_KEY = 'simplyfpl:lastEntryId';
const USER_ENTRY_ID = 12345;
const LEAGUE_ID = 999;

interface Standing {
  id: number;
  entry: number;
  entry_name: string;
  player_name: string;
  rank: number;
  last_rank: number;
  rank_sort: number;
  total: number;
  event_total: number;
}

function makeStanding(entry: number, rank: number): Standing {
  return {
    id: entry,
    entry,
    entry_name: `Team ${entry}`,
    player_name: `Manager ${entry}`,
    rank,
    last_rank: rank,
    rank_sort: rank,
    total: 1000 - rank,
    event_total: 60 - rank,
  };
}

function makePicks(entry: number) {
  return {
    active_chip: null,
    automatic_subs: [],
    entry_history: {
      event: 1,
      points: 0,
      total_points: 0,
      rank: 1,
      rank_sort: 1,
      overall_rank: 1,
      event_transfers: 0,
      event_transfers_cost: 0,
      points_on_bench: 0,
    },
    picks: Array.from({ length: 15 }, (_, i) => {
      let multiplier = 0;
      if (i === 0) multiplier = 2;
      else if (i < 11) multiplier = 1;
      return {
        element: entry * 100 + i + 1,
        position: i + 1,
        multiplier,
        is_captain: i === 0,
        is_vice_captain: i === 1,
      };
    }),
  };
}

Given('my team ID {int} is stored in local storage', async ({ page }, entryId: number) => {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key as string, String(value));
    },
    [STORAGE_KEY, entryId]
  );
});

Given('the Worker returns bootstrap static data for the rivals view', async ({ page }) => {
  await page.route(`${WORKER_URL}/fpl/bootstrap-static-slim`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        events: [
          {
            id: 1,
            name: 'Gameweek 1',
            deadline_time: '2025-08-15T17:30:00Z',
            is_current: true,
            is_next: false,
            is_previous: false,
            average_entry_score: 52,
            highest_score: null,
            finished: false,
          },
        ],
        element_types: [],
        teams: [{ id: 1, name: 'Arsenal', short_name: 'ARS', code: 3 }],
        elements: [],
      }),
    })
  );
});

Given('the Worker returns live gameweek data for the rivals view', async ({ page }) => {
  await page.route(`${WORKER_URL}/fpl/event/*/live/`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ elements: [] }),
    })
  );
});

Given(
  'the Worker returns a 20-manager league standings response for league 999',
  async ({ page }) => {
    const standings = Array.from({ length: 20 }, (_, i) => {
      const rank = i + 1;
      const entry = rank === 10 ? USER_ENTRY_ID : 1000 + i;
      return makeStanding(entry, rank);
    });
    await page.route(`${WORKER_URL}/fpl/leagues/${LEAGUE_ID}/summary**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          league: {
            id: LEAGUE_ID,
            name: 'Rivals Test League',
            created: '2025-08-01T00:00:00Z',
            admin_entry: 1,
            start_event: 1,
            league_type: 'x',
          },
          standings: { has_next: false, page: 1, results: standings },
        }),
      })
    );
  }
);

Given('the Worker returns picks for every rival entry in the window', async ({ page }) => {
  await page.route(`${WORKER_URL}/fpl/entry/*/event/*/picks/`, (route) => {
    const url = new URL(route.request().url());
    const match = url.pathname.match(/entry\/(\d+)\/event/);
    const entryId = match ? Number(match[1]) : 0;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(makePicks(entryId)),
    });
  });
});

When('I visit the rivals page for league {int}', async ({ page }, leagueId: number) => {
  await page.goto(`/rivals/${leagueId}`);
});

Then('I should see my team row highlighted as the You row', async ({ page }) => {
  await page.waitForLoadState('domcontentloaded');
  const youTag = page.getByText('You', { exact: true }).first();
  await expect(youTag).toBeVisible({ timeout: 10000 });
});

Then('I should see managers above and below me in the rivals board', async ({ page }) => {
  await page.waitForLoadState('domcontentloaded');
  const board = page.locator('[data-testid="rivals-board"]');
  await expect(board).toBeVisible({ timeout: 10000 });
  const ranks = board.getByText(/^#\d+$/);
  const count = await ranks.count();
  expect(count).toBeGreaterThanOrEqual(3);
});
