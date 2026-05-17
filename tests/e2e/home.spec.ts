import { expect, test } from '@playwright/test';

import { collectPageErrors } from './_helpers/page-errors';

test('home page renders without browser errors', async ({ page }) => {
  const collector = collectPageErrors(page);

  const response = await page.goto('/');

  expect(response?.status(), 'GET / should return 200').toBe(200);
  await expect(page).toHaveTitle(/simply\.?fpl/i);

  expect(collector.errors, `Browser errors on /:\n${collector.errors.join('\n')}`).toEqual([]);
});
