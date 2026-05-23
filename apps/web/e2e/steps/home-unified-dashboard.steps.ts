import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

When('I visit the home page with the unified flag override', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
});

Then('the unified dashboard contains all four sections', async ({ page }) => {
  await expect(page.getByTestId('home-unified-dashboard')).toBeVisible();
  for (const testid of [
    'home-unified-live-rank',
    'home-unified-effective-ownership',
    'home-unified-threats',
    'home-unified-rivals',
  ]) {
    await expect(page.getByTestId(testid)).toBeVisible();
  }
});
