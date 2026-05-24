import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

const THEME_STORAGE_KEY = 'simplyfpl:theme';

When('I select the {string} theme from the header', async ({ page }, label: string) => {
  await page.getByRole('radio', { name: label, exact: true }).first().click();
});

Then('the active theme is {string}', async ({ page }, theme: string) => {
  await expect
    .poll(() => page.evaluate((key) => window.localStorage.getItem(key), THEME_STORAGE_KEY))
    .toBe(theme);
  await expect(page.locator(`.t_${theme}`).first()).toBeAttached();
});

Then('reloading the page keeps the {string} theme', async ({ page }, theme: string) => {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator(`.t_${theme}`).first()).toBeAttached();
  const stored = await page.evaluate((key) => window.localStorage.getItem(key), THEME_STORAGE_KEY);
  expect(stored).toBe(theme);
});
