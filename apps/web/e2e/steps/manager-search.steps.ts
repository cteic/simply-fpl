import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

const WORKER_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';

Given('the Worker returns entry data for manager 12345', async ({ page }) => {
  await page.route(`${WORKER_URL}/fpl/entry/12345/`, (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 12345,
        player_first_name: 'Test',
        player_last_name: 'Manager',
        name: 'Test FC',
        summary_overall_rank: 500000,
        summary_overall_points: 800,
        summary_event_rank: null,
        summary_event_points: 52,
      }),
    });
  });
});

When('I navigate directly to the rank page for manager 12345', async ({ page }) => {
  await page.goto('/rank/12345');
});

Then('the page should load without a navigation error', async ({ page }) => {
  await page.waitForLoadState('domcontentloaded');
  await expect(page).not.toHaveURL(/\/_error/);
});
