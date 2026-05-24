import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Then } = createBdd();

Then('the cohort table compares my score against each tier', async ({ page }) => {
  await expect(page.getByText('Cohort comparison', { exact: true })).toBeVisible();
  for (const header of ['You', 'Top 10k', 'Overall', 'Legendary']) {
    await expect(page.getByText(header, { exact: true })).toBeVisible();
  }
  await expect(page.getByText('Score', { exact: true })).toBeVisible();
});

Then('the cohort comparison shows a coming-soon placeholder', async ({ page }) => {
  await expect(page.getByText('Cohort comparison', { exact: true })).toBeVisible();
  await expect(page.getByText('coming soon', { exact: false })).toBeVisible();
});
