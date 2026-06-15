import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, Then } = createBdd();

Given('the Worker returns 404 for the cohort aggregates endpoint', async ({ page }) => {
  await page.route(/\/cohorts\/gw\d+\/aggregates\.json$/, (route) =>
    route.fulfill({ status: 404, body: '' })
  );
});

Then('the cohort table compares my score against each tier', async ({ page }) => {
  await expect(page.getByText('Cohort comparison', { exact: true })).toBeVisible();
  for (const header of ['You', 'Top 10k', 'Overall', 'Top 1k']) {
    await expect(page.getByText(header, { exact: true })).toBeVisible();
  }
  for (const row of ['Score', 'Players played', 'Budget played', 'Captain pts']) {
    await expect(page.getByText(row, { exact: true })).toBeVisible();
  }
});

Then('the cohort comparison shows a data unavailable message', async ({ page }) => {
  await expect(page.getByText('Cohort comparison', { exact: true })).toBeVisible();
  await expect(page.getByText('Cohort data unavailable', { exact: true })).toBeVisible();
});
