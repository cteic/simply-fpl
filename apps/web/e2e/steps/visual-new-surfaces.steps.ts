import type { Route } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When } = createBdd();

const WORKER_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';

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
        measuredAt: '2026-05-19T06:00:00.000Z',
        week: '2026-W21',
        sites: [
          {
            slug: 'simplyfpl',
            label: 'SimplyFPL',
            url: 'https://simplyfpl.com/',
            timeToFirstData: 920,
            totalBytes: 327680,
            thirdPartyCount: 2,
            screenshotKey: 'vs/2026-W21/simplyfpl.jpg',
          },
          {
            slug: 'livefpl',
            label: 'livefpl.net',
            url: 'https://livefpl.net/',
            timeToFirstData: 3400,
            totalBytes: 1887437,
            thirdPartyCount: 12,
            screenshotKey: 'vs/2026-W21/livefpl.jpg',
          },
        ],
      }),
    })
  );
  await page.route(`${WORKER_URL}/vs/screenshot/**`, (route: Route) =>
    route.fulfill({ status: 404, body: '' })
  );
});

When('I visit the vs-livefpl page', async ({ page }) => {
  await page.goto('/vs-livefpl', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
});
