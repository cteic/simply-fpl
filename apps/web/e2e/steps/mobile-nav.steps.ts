import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

const PORTRAIT = { width: 390, height: 844 };
const LANDSCAPE = { width: 844, height: 390 };

When('I visit the home page on a phone in portrait', async ({ page }) => {
  await page.setViewportSize(PORTRAIT);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
});

When('I visit the home page on a phone in landscape', async ({ page }) => {
  await page.setViewportSize(LANDSCAPE);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
});

Then('the live rank pill shows the rank', async ({ page }) => {
  await expect(page.getByTestId('live-status-pill')).toBeVisible();
  await expect(page.getByTestId('live-status-pill-rank')).toBeVisible();
});
