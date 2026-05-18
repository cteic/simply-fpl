import { expect, test } from '@playwright/test';

import { collectPageErrors } from '../_helpers/page-errors';
import { installWorkerMocks } from '../_helpers/worker-mocks';

test('/leagues renders the no-team prompt for an unlinked browser', async ({ page }) => {
  await installWorkerMocks(page);
  const collector = collectPageErrors(page);

  const response = await page.goto('/leagues');

  expect(response?.status(), 'GET /leagues should return 200').toBe(200);

  await expect(page.getByText('Enter your FPL team ID to see your leagues')).toBeVisible();

  expect(collector.errors, `Browser errors on /leagues:\n${collector.errors.join('\n')}`).toEqual(
    []
  );
});
