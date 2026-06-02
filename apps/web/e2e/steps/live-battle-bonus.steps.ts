import type { Page, Route } from '@playwright/test';
import { expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

const WORKER_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';
const STORAGE_KEY = 'simplyfpl:lastEntryId';
const ENTRY_ID = '9001';

const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures/fpl');

interface PageErrorBag {
  errors: Error[];
}

const PAGE_ERRORS: WeakMap<Page, PageErrorBag> = new WeakMap();

function trackPageErrors(page: Page): PageErrorBag {
  const existing = PAGE_ERRORS.get(page);
  if (existing !== undefined) return existing;
  const bag: PageErrorBag = { errors: [] };
  PAGE_ERRORS.set(page, bag);
  page.on('pageerror', (err) => {
    bag.errors.push(err);
  });
  return bag;
}

function readFixture(name: string): string {
  return readFileSync(resolve(FIXTURES_DIR, name), 'utf8');
}

function jsonResponse(body: string) {
  return { status: 200, contentType: 'application/json', body } as const;
}

function notFoundResponse() {
  return {
    status: 404,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'not found' }),
  } as const;
}

async function installWorkerRoutes(page: Page): Promise<void> {
  // GW37 average is 0 in the shared bootstrap; give it a real value so the
  // pre/post-subs rank estimate produces a meaningful, switchable number.
  const bootstrap = JSON.parse(readFixture('bootstrap-static.json'));
  for (const event of bootstrap.events) {
    if (event.id === 37) event.average_entry_score = 50;
  }
  const bootstrapBody = JSON.stringify(bootstrap);

  const live = readFixture('event-37-live-battle.json');
  const fixtures = readFixture('fixtures-37-battle.json');
  const entry = readFixture('entry-9001.json');
  const picks = readFixture('entry-9001-event-37-picks.json');

  const snapshot = JSON.stringify({
    bootstrap,
    entry: JSON.parse(entry),
    picks: JSON.parse(picks),
    gw: 37,
  });

  await page.route(`${WORKER_URL}/**`, (route: Route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

    if (pathname === `/snapshot/entry/${ENTRY_ID}`) return route.fulfill(jsonResponse(snapshot));
    if (pathname === '/fpl/bootstrap-static-slim')
      return route.fulfill(jsonResponse(bootstrapBody));
    if (/^\/fpl\/event\/\d+\/live\/$/.test(pathname)) return route.fulfill(jsonResponse(live));
    if (pathname.startsWith('/fpl/fixtures-slim')) return route.fulfill(jsonResponse(fixtures));
    if (pathname === `/fpl/entry/${ENTRY_ID}/`) return route.fulfill(jsonResponse(entry));
    if (pathname === `/fpl/entry/${ENTRY_ID}/event/37/picks/`)
      return route.fulfill(jsonResponse(picks));
    if (pathname.startsWith('/fpl/')) return route.fulfill(notFoundResponse());
    if (pathname.startsWith('/snapshot/')) return route.fulfill(notFoundResponse());

    return route.continue();
  });
}

async function seedStorage(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // ignore storage errors in test contexts
      }
    },
    { key: STORAGE_KEY, value: ENTRY_ID }
  );
}

async function settle(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
  await expect(page.getByText('Live Battle').first()).toBeVisible({ timeout: 15_000 });
}

Given('the Worker returns deterministic live-battle fixtures', async ({ page }) => {
  trackPageErrors(page);
  await page.clock.setFixedTime(new Date('2026-05-22T12:00:00Z'));
  await installWorkerRoutes(page);
  await seedStorage(page);
});

When('I visit the live-battle dashboard', async ({ page }) => {
  await settle(page);
});

When('I visit the live-battle dashboard on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await settle(page);
});

Then('no live-battle page error should have occurred', async ({ page }) => {
  const bag = PAGE_ERRORS.get(page);
  const messages = (bag?.errors ?? []).map((e) => `${e.name}: ${e.message}\n${e.stack ?? ''}`);
  expect(messages, `Unexpected pageerror events:\n${messages.join('\n---\n')}`).toHaveLength(0);
});

Then('the Live Battle panel shows the PTS column header', async ({ page }) => {
  await expect(page.getByText('Gains', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Losses', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Pts', { exact: true }).first()).toBeVisible();
});

Then('the Live Battle panel shows a per-column Total and an overall Net', async ({ page }) => {
  await expect(page.getByText('Total', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Net vs field', { exact: true }).first()).toBeVisible();
});

Then('the autosubs toggle is visible', async ({ page }) => {
  const toggle = page.getByLabel('Autosubs toggle');
  await expect(toggle).toBeVisible();
  await expect(toggle.getByText('Pre', { exact: true })).toBeVisible();
  await expect(toggle.getByText('Post', { exact: true })).toBeVisible();
});

function gwPointsValue(page: Page) {
  // The GW Points stat tile renders its label then its monospace value.
  return page
    .locator('div', { has: page.getByText('GW Points', { exact: true }) })
    .last()
    .innerText();
}

Then('switching to Post subs changes the displayed GW points', async ({ page }) => {
  const before = await gwPointsValue(page);
  await page.getByLabel('Autosubs toggle').getByText('Post', { exact: true }).click();
  await expect.poll(async () => gwPointsValue(page), { timeout: 5_000 }).not.toBe(before);
});

Then('the provisional bonus note is visible', async ({ page }) => {
  await expect(page.getByLabel('Provisional bonus note')).toBeVisible();
});

Then('the Live Battle gains and losses columns do not overlap', async ({ page }) => {
  const gains = page.getByText('Gains', { exact: true }).first();
  const losses = page.getByText('Losses', { exact: true }).first();
  await expect(gains).toBeVisible();
  await expect(losses).toBeVisible();
  const gainsBox = await gains.boundingBox();
  const lossesBox = await losses.boundingBox();
  expect(gainsBox, 'gains column header has no box').not.toBeNull();
  expect(lossesBox, 'losses column header has no box').not.toBeNull();
  if (gainsBox && lossesBox) {
    // Stacked on a phone: the Losses header starts below the Gains header.
    expect(
      lossesBox.y,
      `losses header y=${lossesBox.y} should sit below gains header y=${gainsBox.y}`
    ).toBeGreaterThan(gainsBox.y + gainsBox.height - 1);
  }
});
