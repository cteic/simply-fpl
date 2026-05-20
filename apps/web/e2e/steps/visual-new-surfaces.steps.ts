import type { Route } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When } = createBdd();

const WORKER_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';
const SAVED_ENTRY_ID = 1;

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
    total: 2000 - rank * 10,
    event_total: 70 - rank * 2,
  };
}

function makeDeterministicPicks(entry: number) {
  return {
    active_chip: null,
    automatic_subs: [],
    entry_history: {
      event: 37,
      points: 60 - entry,
      total_points: 2000 - entry,
      rank: entry,
      rank_sort: entry,
      overall_rank: entry * 100,
      event_transfers: 0,
      event_transfers_cost: 0,
      points_on_bench: 6,
    },
    picks: Array.from({ length: 15 }, (_, i) => {
      let multiplier = 0;
      if (i === 0) multiplier = 2;
      else if (i < 11) multiplier = 1;
      return {
        element: ((entry * 7 + i) % 600) + 1,
        position: i + 1,
        multiplier,
        is_captain: i === 0,
        is_vice_captain: i === 1,
      };
    }),
  };
}

Given('the Worker returns an 8-manager rivals league with the user mid-pack', async ({ page }) => {
  const leagueId = 8888;
  const entries = [101, 102, 103, SAVED_ENTRY_ID, 104, 105, 106, 107];
  const standings = entries.map((entry, idx) => makeStanding(entry, idx + 1));

  await page.route(`${WORKER_URL}/fpl/leagues-classic/${leagueId}/standings/**`, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        league: {
          id: leagueId,
          name: 'Mid-Pack Mini-League',
          created: '2025-08-01T00:00:00Z',
          admin_entry: 101,
          start_event: 1,
          league_type: 'x',
        },
        standings: { has_next: false, page: 1, results: standings },
      }),
    })
  );

  await page.route(`${WORKER_URL}/fpl/entry/*/event/*/picks/`, (route: Route) => {
    const url = new URL(route.request().url());
    const match = url.pathname.match(/entry\/(\d+)\/event/);
    const entryId = match ? Number(match[1]) : 0;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(makeDeterministicPicks(entryId)),
    });
  });
});

Given('the Worker returns no cohort aggregates for any gameweek', async ({ page }) => {
  await page.route(/\/cohorts\/gw\d+\/aggregates\.json$/, (route: Route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'not found' }),
    })
  );
});

Given('the Worker returns deterministic cohort aggregates for gameweek 37', async ({ page }) => {
  await page.route(/\/cohorts\/gw\d+\/aggregates\.json$/, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        gw: 37,
        tiers: {
          top_10k: {
            captains: [{ player_id: 351, count: 820 }],
            ownership: [
              { player_id: 351, starting_count: 780, bench_count: 20 },
              { player_id: 328, starting_count: 720, bench_count: 0 },
            ],
            transfers_in: [],
            transfers_out: [],
            chips: {},
            entries_sampled: 1000,
            avg_event_points: 58,
          },
          overall: {
            captains: [{ player_id: 351, count: 1200 }],
            ownership: [
              { player_id: 351, starting_count: 1500, bench_count: 100 },
              { player_id: 328, starting_count: 900, bench_count: 0 },
            ],
            transfers_in: [],
            transfers_out: [],
            chips: {},
            entries_sampled: 2000,
            avg_event_points: 52,
          },
          legendary: {
            captains: [{ player_id: 351, count: 80 }],
            ownership: [{ player_id: 351, starting_count: 85, bench_count: 0 }],
            transfers_in: [],
            transfers_out: [],
            chips: {},
            entries_sampled: 100,
            avg_event_points: 65,
          },
        },
      }),
    })
  );
});

Given('the Worker returns deterministic vs-livefpl speed comparison data', async ({ page }) => {
  await page.route(`${WORKER_URL}/vs/data`, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        gw: 37,
        generated_at: '2026-05-15T23:00:00.000Z',
        simplyfpl: { p50_ms: 240, p95_ms: 410 },
        livefpl: { p50_ms: 1980, p95_ms: 3400 },
      }),
    })
  );
});

When('I visit the threats page', async ({ page }) => {
  await page.goto('/threats', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
});

When('I visit the effective ownership page', async ({ page }) => {
  await page.goto('/effective-ownership', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
});

When('I visit the vs-livefpl page', async ({ page }) => {
  await page.goto('/vs-livefpl', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
});
