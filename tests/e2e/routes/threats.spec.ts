import { expect, test } from '@playwright/test';

import { collectPageErrors } from '../_helpers/page-errors';
import { installWorkerMocks } from '../_helpers/worker-mocks';

const SAVED_ENTRY_ID = '1';
const PLACEHOLDER_ROW_COUNT = 5;

test('/threats renders the threats list with a saved team id', async ({ page }) => {
  await installWorkerMocks(page);
  const collector = collectPageErrors(page);

  await page.addInitScript((id: string) => {
    try {
      window.localStorage.setItem('simplyfpl:lastEntryId', id);
    } catch {
      // ignore
    }
  }, SAVED_ENTRY_ID);

  const response = await page.goto('/threats');

  expect(response?.status(), 'GET /threats should return 200').toBe(200);

  await expect(page.getByText('Threats', { exact: false }).first()).toBeVisible();
  await expect(
    page.getByText(`Top threats (${PLACEHOLDER_ROW_COUNT})`, { exact: false })
  ).toBeVisible();
  await expect(page.getByText('Haaland', { exact: false }).first()).toBeVisible();
  await expect(page.getByText(/Placeholder data/i)).toBeVisible();

  expect(collector.errors, `Browser errors on /threats:\n${collector.errors.join('\n')}`).toEqual(
    []
  );
});
