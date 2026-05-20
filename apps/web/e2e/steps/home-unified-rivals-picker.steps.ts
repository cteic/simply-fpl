import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Then } = createBdd();

Then('the rivals league picker is visible', async ({ page }) => {
  await expect(page.getByTestId('home-unified-rivals-picker')).toBeVisible();
});

Then("the rivals league picker lists the team's mini-leagues", async ({ page }) => {
  const picker = page.getByTestId('home-unified-rivals-picker');
  await expect(picker.getByText('The Office Bantz', { exact: true })).toBeVisible();
  await expect(picker.getByText('Overall', { exact: true })).toHaveCount(0);
});
