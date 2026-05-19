import { expect, test } from '@playwright/test';

import { collectPageErrors } from '../_helpers/page-errors';
import { installWorkerMocks } from '../_helpers/worker-mocks';

const SAVED_ENTRY_ID = '1';
const PLACEHOLDER_ROW_COUNT = 10;

test('/effective-ownership renders the EO table with a saved team id', async ({ page }) => {
  await installWorkerMocks(page);
  const collector = collectPageErrors(page);

  await page.addInitScript((id: string) => {
    try {
      window.localStorage.setItem('simplyfpl:lastEntryId', id);
    } catch {
      // ignore
    }
  }, SAVED_ENTRY_ID);

  const response = await page.goto('/effective-ownership');

  expect(response?.status(), 'GET /effective-ownership should return 200').toBe(200);

  await expect(page.getByText('Effective Ownership', { exact: false }).first()).toBeVisible();
  await expect(
    page.getByText(`Top ${PLACEHOLDER_ROW_COUNT} by Top 10k EO`, { exact: false })
  ).toBeVisible();
  await expect(page.getByText('Haaland', { exact: false }).first()).toBeVisible();
  await expect(page.getByText(/Placeholder data/i)).toBeVisible();

  expect(
    collector.errors,
    `Browser errors on /effective-ownership:\n${collector.errors.join('\n')}`
  ).toEqual([]);
});
