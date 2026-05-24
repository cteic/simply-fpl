import type { Page, Route } from '@playwright/test';
import { expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

const WORKER_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';
const STORAGE_KEY = 'simplyfpl:lastEntryId';

const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures/fpl');

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

async function installPicksNotReadyWorker(page: Page): Promise<void> {
  const bootstrap = readFixture('bootstrap-static.json');
  const liveEvent37 = readFixture('event-37-live.json');
  const entry1 = readFixture('entry-1.json');

  const snapshotNoPicks = JSON.stringify({
    bootstrap: JSON.parse(bootstrap),
    entry: JSON.parse(entry1),
    picks: null,
    gw: 37,
    picksAvailable: false,
  });

  await page.route(`${WORKER_URL}/**`, (route: Route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (/^\/snapshot\/entry\/\d+\/?$/.test(pathname)) {
      return route.fulfill(jsonResponse(snapshotNoPicks));
    }
    if (pathname === '/fpl/bootstrap-static-slim') return route.fulfill(jsonResponse(bootstrap));
    if (/^\/fpl\/event\/\d+\/live\/$/.test(pathname)) {
      return route.fulfill(jsonResponse(liveEvent37));
    }
    if (pathname === '/fpl/entry/1/') return route.fulfill(jsonResponse(entry1));
    if (pathname === '/fpl/fixtures-slim') return route.fulfill(jsonResponse('[]'));
    if (pathname.startsWith('/fpl/')) return route.fulfill(notFoundResponse());
    return route.continue();
  });
}

async function seedStorage(page: Page, entryId: string): Promise<void> {
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // ignore storage errors in test contexts
      }
    },
    { key: STORAGE_KEY, value: entryId }
  );
}

Given('the Worker returns a snapshot with no picks for the current gameweek', async ({ page }) => {
  await installPicksNotReadyWorker(page);
});

Given('a team id is saved in storage for the picks-not-ready scenario', async ({ page }) => {
  await seedStorage(page, '1');
});

When('I visit the home page for the picks-not-ready scenario', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
});

Then('I see the no-picks-yet message', async ({ page }) => {
  await expect(
    page.getByText('No picks yet for this gameweek', { exact: false }).first()
  ).toBeVisible();
});

Then('I do not see the team load error', async ({ page }) => {
  await expect(page.getByText('Could not load this team', { exact: false })).toHaveCount(0);
});
