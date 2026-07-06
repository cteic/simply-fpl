import type { Page, Route } from '@playwright/test';
import { expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

const WORKER_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';

const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures/fpl');

function readFixture(name: string): string {
  return readFileSync(resolve(FIXTURES_DIR, name), 'utf8');
}

function jsonResponse(body: string) {
  return { status: 200, contentType: 'application/json', body } as const;
}

function serverErrorResponse() {
  return {
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'upstream failure' }),
  } as const;
}

async function installH2hErrorWorker(page: Page): Promise<void> {
  const bootstrap = readFixture('bootstrap-static.json');
  const liveEvent37 = readFixture('event-37-live.json');
  const entry1 = readFixture('entry-1.json');
  const entry1Picks = readFixture('entry-1-event-37-picks.json');

  await page.route(`${WORKER_URL}/**`, (route: Route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/fpl/bootstrap-static-slim') return route.fulfill(jsonResponse(bootstrap));
    if (/^\/fpl\/event\/\d+\/live\/$/.test(pathname)) {
      return route.fulfill(jsonResponse(liveEvent37));
    }
    if (pathname === '/fpl/entry/1/') return route.fulfill(jsonResponse(entry1));
    if (pathname === '/fpl/entry/1/event/37/picks/') {
      return route.fulfill(jsonResponse(entry1Picks));
    }
    if (pathname === '/fpl/entry/2/') return route.fulfill(serverErrorResponse());
    if (pathname === '/fpl/fixtures-slim') return route.fulfill(jsonResponse('[]'));
    if (pathname.startsWith('/fpl/')) return route.fulfill(serverErrorResponse());
    return route.continue();
  });
}

Given(
  'the Worker fails to load the second manager for the head-to-head scenario',
  async ({ page }) => {
    await installH2hErrorWorker(page);
  }
);

When('I visit the head-to-head page with a failing manager', async ({ page }) => {
  await page.goto('/h2h/1/2', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
});

Then('I see the matchup load error', async ({ page }) => {
  await expect(page.getByText("Couldn't load this matchup", { exact: false }).first()).toBeVisible({
    timeout: 15_000,
  });
});
