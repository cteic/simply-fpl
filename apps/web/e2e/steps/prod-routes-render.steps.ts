import type { Page, Route } from '@playwright/test';
import { expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

const WORKER_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';
const STORAGE_KEY = 'simplyfpl:lastEntryId';
const SAVED_ENTRY_ID = '1';

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
  return {
    status: 200,
    contentType: 'application/json',
    body,
  } as const;
}

function notFoundResponse() {
  return {
    status: 404,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'not found' }),
  } as const;
}

async function installWorkerRoutes(page: Page): Promise<void> {
  const bootstrap = readFixture('bootstrap-static.json');
  const liveEvent37 = readFixture('event-37-live.json');
  const entry1 = readFixture('entry-1.json');
  const entry1Picks = readFixture('entry-1-event-37-picks.json');
  const entry1History = readFixture('entry-1-history.json');
  const entry2 = readFixture('entry-2.json');
  const entry2Picks = readFixture('entry-2-event-37-picks.json');
  const entry3 = readFixture('entry-3.json');
  const league314 = readFixture('leagues-classic-314.json');
  const league1001 = readFixture('leagues-classic-1001.json');
  const league200001 = readFixture('leagues-classic-200001.json');

  const statusPayload = JSON.stringify({
    worker: 'ok',
    kv: 'ok',
    fpl: 'ok',
    durable_object: 'ok',
    version: 'test-1.0.0',
    timestamp: '2026-05-15T23:00:00.000Z',
  });

  const snapshotByEntry: Record<string, string> = {
    '1': JSON.stringify({
      bootstrap: JSON.parse(bootstrap),
      entry: JSON.parse(entry1),
      picks: JSON.parse(entry1Picks),
      gw: 37,
    }),
    '2': JSON.stringify({
      bootstrap: JSON.parse(bootstrap),
      entry: JSON.parse(entry2),
      picks: JSON.parse(entry2Picks),
      gw: 37,
    }),
  };

  await page.route(`${WORKER_URL}/**`, (route: Route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

    const snapshotMatch = pathname.match(/^\/snapshot\/entry\/(\d+)\/?$/);
    if (snapshotMatch && snapshotMatch[1]) {
      const id = snapshotMatch[1];
      const payload = snapshotByEntry[id];
      if (payload) return route.fulfill(jsonResponse(payload));
      return route.fulfill(notFoundResponse());
    }

    if (pathname === '/status') return route.fulfill(jsonResponse(statusPayload));
    if (pathname === '/fpl/bootstrap-static/') return route.fulfill(jsonResponse(bootstrap));
    if (pathname === '/fpl/event/37/live/') return route.fulfill(jsonResponse(liveEvent37));
    if (/^\/fpl\/event\/\d+\/live\/$/.test(pathname)) {
      return route.fulfill(jsonResponse(liveEvent37));
    }
    if (pathname === '/fpl/entry/1/') return route.fulfill(jsonResponse(entry1));
    if (pathname === '/fpl/entry/1/event/37/picks/')
      return route.fulfill(jsonResponse(entry1Picks));
    if (pathname === '/fpl/entry/1/history/') return route.fulfill(jsonResponse(entry1History));
    if (pathname === '/fpl/entry/2/') return route.fulfill(jsonResponse(entry2));
    if (pathname === '/fpl/entry/2/event/37/picks/')
      return route.fulfill(jsonResponse(entry2Picks));
    if (pathname === '/fpl/entry/3/') return route.fulfill(jsonResponse(entry3));
    if (pathname === '/fpl/leagues-classic/314/standings/')
      return route.fulfill(jsonResponse(league314));
    if (pathname === '/fpl/leagues-classic/1001/standings/')
      return route.fulfill(jsonResponse(league1001));
    if (pathname === '/fpl/leagues-classic/200001/standings/')
      return route.fulfill(jsonResponse(league200001));
    if (pathname === '/fpl/fixtures/') return route.fulfill(jsonResponse('[]'));
    if (pathname.startsWith('/fpl/')) return route.fulfill(notFoundResponse());

    return route.continue();
  });
}

async function seedStorage(page: Page, entryId: string | null): Promise<void> {
  await page.addInitScript(
    ({ key, value }: { key: string; value: string | null }) => {
      try {
        if (value === null) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, value);
        }
      } catch {
        // ignore storage errors in test contexts
      }
    },
    { key: STORAGE_KEY, value: entryId }
  );
}

async function visitAndSettle(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
}

Given('the Worker returns deterministic FPL fixtures', async ({ page }) => {
  trackPageErrors(page);
  // Freeze the wall clock (timers keep running) so the nav gameweek-deadline
  // countdown renders a stable value across runs. The bootstrap fixture's next
  // gameweek (GW38) has a deadline of 2026-05-23T15:00:00Z, so this fixed time
  // yields a deterministic "1d 3h".
  await page.clock.setFixedTime(new Date('2026-05-22T12:00:00Z'));
  await installWorkerRoutes(page);
});

Given('no team is saved in storage', async ({ page }) => {
  await seedStorage(page, null);
});

Given('a team id is saved in storage', async ({ page }) => {
  await seedStorage(page, SAVED_ENTRY_ID);
});

When('I visit the home page', async ({ page }) => {
  await visitAndSettle(page, '/');
});

When('I visit the live rank page for entry 1', async ({ page }) => {
  await visitAndSettle(page, '/rank/1');
});

When('I visit the head-to-head page for entries 1 and 2', async ({ page }) => {
  await visitAndSettle(page, '/h2h/1/2');
});

When('I visit the leagues page', async ({ page }) => {
  await visitAndSettle(page, '/leagues');
});

When('I visit the status page', async ({ page }) => {
  await visitAndSettle(page, '/status');
});

Then('no page error should have occurred', async ({ page }) => {
  const bag = PAGE_ERRORS.get(page);
  const messages = (bag?.errors ?? []).map((e) => `${e.name}: ${e.message}\n${e.stack ?? ''}`);
  expect(messages, `Unexpected pageerror events:\n${messages.join('\n---\n')}`).toHaveLength(0);
});

Then('the live rank hero and stat tiles are visible', async ({ page }) => {
  await expect(page.getByText('est. live rank', { exact: false }).first()).toBeVisible();
  // Safety Score / Off Top 10k tiles only render once real cohort aggregates
  // exist; the always-present tiles are asserted here.
  for (const label of ['GW Points', 'Total Points', 'On Bench', 'Captain']) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
});

Then('the rendered page matches the snapshot {string}', async ({ page }, name: string) => {
  await page.evaluate(() => document.fonts.ready).catch(() => undefined);
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: true,
    animations: 'disabled',
    maxDiffPixelRatio: 0.05,
  });
});

// The live-rank pitch is lazy-loaded (next/dynamic, ssr: false), so it paints a
// beat after the rest of the page. Wait for its squad to render before
// snapshotting, otherwise the gate captures an empty pitch shell.
Then(
  'the rendered page with the live pitch matches the snapshot {string}',
  async ({ page }, name: string) => {
    await expect(page.getByText('FPL Test FC').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Saka').first()).toBeVisible({ timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready).catch(() => undefined);
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    });
  }
);
