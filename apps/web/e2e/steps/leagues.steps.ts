import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

const STORAGE_KEY = 'simplyfpl:lastEntryId';
const MULTI_LEAGUE_ENTRY_ID = '3';

Given('a team with multiple mini-leagues is saved in storage', async ({ page }) => {
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // ignore storage errors in test contexts
      }
    },
    { key: STORAGE_KEY, value: MULTI_LEAGUE_ENTRY_ID }
  );
});

Then('I see a tab for each of my mini-leagues', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Ireland' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'The Office Bantz' })).toBeVisible();
});

When('I switch to the {string} league tab', async ({ page }, name: string) => {
  await page.getByRole('button', { name }).click();
});

Then('the manager {string} is shown in the standings', async ({ page }, manager: string) => {
  await expect(page.getByText(manager, { exact: false }).first()).toBeVisible();
});

When('I open a head-to-head against a rival in the standings', async ({ page }) => {
  await page.getByText("P. O'Connor", { exact: false }).first().click();
});

Then('the head-to-head route for my team opens', async ({ page }) => {
  await page.waitForURL(/\/h2h\/3\/\d+/, { timeout: 10_000 });
});

When('I open the rivals view for the active league', async ({ page }) => {
  await page.getByRole('button', { name: 'View rivals' }).click();
});

Then('the rivals route for that league opens', async ({ page }) => {
  await page.waitForURL(/\/rivals\/\d+/, { timeout: 10_000 });
});
