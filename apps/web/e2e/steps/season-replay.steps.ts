import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

interface ReplayPageErrorBag {
  errors: Error[];
}

const REPLAY_PAGE_ERRORS = new WeakMap<Page, ReplayPageErrorBag>();

function trackReplayErrors(page: Page): ReplayPageErrorBag {
  const existing = REPLAY_PAGE_ERRORS.get(page);
  if (existing) return existing;
  const bag: ReplayPageErrorBag = { errors: [] };
  REPLAY_PAGE_ERRORS.set(page, bag);
  page.on('pageerror', (err) => {
    bag.errors.push(err);
  });
  return bag;
}

When('I open the season-replay route', async ({ page }) => {
  trackReplayErrors(page);
  await page.goto('/replay', { waitUntil: 'domcontentloaded' });
});

Then('the replay controls are visible', async ({ page }) => {
  await expect(page.getByTestId('replay-controls')).toBeVisible({ timeout: 15_000 });
});

Then('no replay page error should have occurred', async ({ page }) => {
  const bag = REPLAY_PAGE_ERRORS.get(page);
  const messages = (bag?.errors ?? []).map((e) => `${e.name}: ${e.message}`);
  expect(messages, `Unexpected pageerror events:\n${messages.join('\n---\n')}`).toHaveLength(0);
});

Then("the live-rank dashboard renders the replay manager's team", async ({ page }) => {
  // The replay bundle drives entry 1831434 ("POMO FC"). Surface a stable hook
  // the live-rank view always renders — the GW Points tile.
  await expect(page.getByText('GW Points').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Total Points').first()).toBeVisible();
});

When('I press play at 60x on the replay controls', async ({ page }) => {
  await expect(page.getByTestId('replay-controls')).toBeVisible({ timeout: 30_000 });
  // Wait for the dashboard to mount so the bundle is ready
  await expect(page.getByText('GW Points').first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: '60x' }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
});

Then('the replay clock advances past GW 1 within five seconds', async ({ page }) => {
  // At 60x with 60s GW duration the clock should reach GW3+ within ~5 s of
  // wall-clock playback. We assert a label change rather than the exact GW
  // value so we are not coupled to the clamp/snapping behaviour.
  const label = page.getByTestId('replay-progress-label');
  await expect(label).toContainText('GW1', { timeout: 5_000 });
  await expect(label).not.toContainText('GW1 ·', { timeout: 8_000 });
});
