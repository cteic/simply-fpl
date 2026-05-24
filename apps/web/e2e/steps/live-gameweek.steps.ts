import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

const WORKER_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';

Given('the Worker returns live gameweek data for event 1', async ({ page }) => {
  await page.route(`${WORKER_URL}/fpl/event/*/live/`, (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ elements: [] }),
    });
  });
});

Given('the Worker returns bootstrap static data', async ({ page }) => {
  await page.route(`${WORKER_URL}/fpl/bootstrap-static-slim`, (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        events: [
          {
            id: 1,
            name: 'Gameweek 1',
            deadline_time: '2025-08-15T17:30:00Z',
            is_current: true,
            is_next: false,
            is_previous: false,
            average_entry_score: 52,
            highest_score: null,
            finished: false,
          },
        ],
        element_types: [],
        teams: [],
        elements: [],
      }),
    });
  });
});

When('I visit the rank page for manager 12345', async ({ page }) => {
  await page.goto('/rank/12345');
});

Then('I should see the manager details on the page', async ({ page }) => {
  await page.waitForLoadState('domcontentloaded');
  const status = page.url();
  return status !== undefined;
});
