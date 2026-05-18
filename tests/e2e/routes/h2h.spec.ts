import { expect, test } from '@playwright/test';

import { collectPageErrors } from '../_helpers/page-errors';
import { installWorkerMocks } from '../_helpers/worker-mocks';

const ENTRY_A = 219895;
const ENTRY_B = 2351931;

test(`/h2h/${ENTRY_A}/${ENTRY_B} renders the Head to Head header without browser errors`, async ({
  page,
}) => {
  await installWorkerMocks(page);
  const collector = collectPageErrors(page);

  const response = await page.goto(`/h2h/${ENTRY_A}/${ENTRY_B}`);

  expect(response?.status(), `GET /h2h/${ENTRY_A}/${ENTRY_B} should return 200`).toBe(200);

  await expect(page.getByText('Head to Head').first()).toBeVisible();

  expect(
    collector.errors,
    `Browser errors on /h2h/${ENTRY_A}/${ENTRY_B}:\n${collector.errors.join('\n')}`
  ).toEqual([]);
});
