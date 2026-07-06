import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

Given('I have no analytics consent cookie', async ({ page }) => {
  await page.context().clearCookies();
});

Given('the ph_consent cookie is already set to {string}', async ({ page }, value: string) => {
  await page.context().clearCookies();
  await page.goto('/');
  await page.context().addCookies([
    {
      name: 'ph_consent',
      value,
      domain: 'localhost',
      path: '/',
    },
  ]);
});

When('I visit the home page again', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
});

When('I click Accept on the consent banner', async ({ page }) => {
  const banner = page.getByRole('dialog', { name: 'Analytics consent' });
  await expect(banner).toBeVisible({ timeout: 5_000 });
  await banner.getByRole('button', { name: 'Accept' }).click();
});

When('I click Decline on the consent banner', async ({ page }) => {
  const banner = page.getByRole('dialog', { name: 'Analytics consent' });
  await expect(banner).toBeVisible({ timeout: 5_000 });
  await banner.getByRole('button', { name: 'Decline' }).click();
});

Then('the analytics consent banner is visible', async ({ page }) => {
  await expect(page.getByRole('dialog', { name: 'Analytics consent' })).toBeVisible({
    timeout: 5_000,
  });
});

Then('the analytics consent banner is not visible', async ({ page }) => {
  await expect(page.getByRole('dialog', { name: 'Analytics consent' })).not.toBeVisible();
});

Then('the ph_consent cookie is not set', async ({ page }) => {
  const cookies = await page.context().cookies();
  const consent = cookies.find((c) => c.name === 'ph_consent');
  expect(consent).toBeUndefined();
});

Then('the ph_consent cookie is {string}', async ({ page }, value: string) => {
  const cookies = await page.context().cookies();
  const consent = cookies.find((c) => c.name === 'ph_consent');
  expect(consent?.value).toBe(value);
});
