import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

When('I visit the head-to-head page for entries 1 and 2 on a tablet', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/h2h/1/2', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
});

Then('the status pill shows a deselect control', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Deselect team' })).toBeVisible();
});

When('I deselect the team from the status pill', async ({ page }) => {
  await page.getByRole('button', { name: 'Deselect team' }).click();
});

Then('the home search hero is shown', async ({ page }) => {
  await expect(page.getByTestId('home-unified-hero')).toBeVisible();
});

Then('the nav shows the Leagues link', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Leagues' })).toBeVisible();
});

When('I deselect my team from the dashboard', async ({ page }) => {
  await page.getByRole('link', { name: 'Deselect team' }).click();
});

Then('the nav no longer shows the Leagues link', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Leagues' })).toHaveCount(0);
});
