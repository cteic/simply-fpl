import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

When('I follow the footer link {string}', async ({ page }, label: string) => {
  await page.locator('footer').getByRole('link', { name: label, exact: true }).click();
  await page.waitForLoadState('domcontentloaded');
});

When('I open the legal page {string}', async ({ page }, path: string) => {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
});

Then('the footer links {string} to {string}', async ({ page }, label: string, path: string) => {
  const link = page.locator('footer').getByRole('link', { name: label, exact: true });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', path);
});

Then('the page heading reads {string}', async ({ page }, heading: string) => {
  await expect(page.getByRole('heading', { level: 1, name: heading, exact: true })).toBeVisible();
});
