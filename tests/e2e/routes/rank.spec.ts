import { expect, test } from '@playwright/test';

import { collectPageErrors } from '../_helpers/page-errors';

const ENTRY_ID = 219895;

test(`/rank/${ENTRY_ID} renders the Live Rank header without browser errors`, async ({ page }) => {
  const collector = collectPageErrors(page);

  const response = await page.goto(`/rank/${ENTRY_ID}`);

  expect(response?.status(), `GET /rank/${ENTRY_ID} should return 200`).toBe(200);

  await expect(page.getByText('Live Rank').first()).toBeVisible();

  expect(
    collector.errors,
    `Browser errors on /rank/${ENTRY_ID}:\n${collector.errors.join('\n')}`
  ).toEqual([]);
});
