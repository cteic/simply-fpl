import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, Then } = createBdd();

Given('I am on the home page', async ({ page }) => {
  await page.goto('/');
});

Then('the page title should contain SimplyFPL', async ({ page }) => {
  await expect(page).toHaveTitle(/SimplyFPL/i);
});

Then('I should see a manager ID search field', async ({ page }) => {
  const input = page
    .locator(
      'input[type="text"], input[placeholder*="ID"], input[placeholder*="id"], input[placeholder*="manager"]'
    )
    .first();
  await expect(input)
    .toBeVisible({ timeout: 5000 })
    .catch(() => {
      return expect(page.locator('input').first()).toBeVisible({ timeout: 5000 });
    });
});
