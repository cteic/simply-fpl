import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

Then('the marketing hero is visible', async ({ page }) => {
  await expect(page.getByTestId('home-unified-hero')).toBeVisible();
});

Then('the marketing hero shows the three value props', async ({ page }) => {
  for (const title of [
    'Real-time live rank',
    'Never crashes under load',
    'Cohort & rivals insight',
  ]) {
    await expect(page.getByText(title, { exact: true })).toBeVisible();
  }
});

When('I enter team id {string} in the hero and submit', async ({ page }, id: string) => {
  const hero = page.getByTestId('home-unified-hero');
  const input = hero.locator('input').first();
  await input.fill(id);
  await input.press('Enter');
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
});
