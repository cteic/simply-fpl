import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Then } = createBdd();

Then('the cohort table renders with four columns and four rows', async ({ page }) => {
  await expect(page.getByText('Cohort comparison', { exact: true })).toBeVisible();
  for (const header of ['You', 'Top 10k', 'Overall', 'Legendary']) {
    await expect(page.getByText(header, { exact: true })).toBeVisible();
  }
  for (const label of ['Score', 'Players played', 'Budget played', 'Captain pts']) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
});
