import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

const WORKER_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';

Given('I am on the prices page', async ({ page }) => {
  await page.goto('/prices');
});

Then('the page should load successfully', async ({ page }) => {
  await page.waitForLoadState('domcontentloaded');
  await expect(page).not.toHaveURL(/500/);
});

Given('the Worker returns bootstrap static data with player prices', async ({ page }) => {
  await page.route(`${WORKER_URL}/fpl/bootstrap-static/`, (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        events: [],
        element_types: [],
        teams: [{ id: 1, name: 'Arsenal', short_name: 'ARS', code: 3 }],
        elements: [
          {
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
            transfers_in_event: 500000,
            transfers_out_event: 50000,
            chance_of_playing_next_round: null,
            news: '',
          },
        ],
      }),
    });
  });
});

When('I visit the prices page', async ({ page }) => {
  await page.goto('/prices');
});

Then('the page should display without a fatal error', async ({ page }) => {
  await page.waitForLoadState('domcontentloaded');
  const title = await page.title();
  expect(title).toBeTruthy();
});
