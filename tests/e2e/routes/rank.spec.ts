import { expect, test } from '@playwright/test';

import { collectPageErrors } from '../_helpers/page-errors';

const ENTRY_ID = 219895;

test(`/rank/${ENTRY_ID} redirects to / without browser errors`, async ({ page }) => {
  const collector = collectPageErrors(page);

  const response = await page.goto(`/rank/${ENTRY_ID}`);

  expect(response?.status(), `GET /rank/${ENTRY_ID} should resolve to 200 after redirect`).toBe(
    200
  );
  expect(new URL(page.url()).pathname, 'should end on the home page').toBe('/');

  expect(
    collector.errors,
    `Browser errors on /rank/${ENTRY_ID} redirect:\n${collector.errors.join('\n')}`
  ).toEqual([]);
});
