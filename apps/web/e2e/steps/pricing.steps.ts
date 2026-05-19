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
  await page.route(`${WORKER_URL}/fpl/prices`, (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        generated_at: '2026-05-19T00:00:00.000Z',
        changes: [
          {
            id: 1,
            web_name: 'Salah',
            element_type: 3,
            team_name: 'Liverpool',
            now_cost: 135,
            ownership: 45.0,
            direction: 'rise',
            probability: 0.85,
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
