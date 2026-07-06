import type { Page, Route } from '@playwright/test';
import { expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

const WORKER_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';
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
  const bootstrap = readFixture('bootstrap-static.json');
  const liveEvent37 = readFixture('event-37-live.json');
  const entry1001 = readFixture('entry-1001.json');
  const entry1002 = readFixture('entry-1002.json');
  const entry1001Picks = readFixture('entry-1-event-37-picks.json');
  const entry1002Picks = readFixture('entry-2-event-37-picks.json');

  await page.route(`${WORKER_URL}/**`, (route: Route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

    if (pathname === '/fpl/bootstrap-static-slim') return route.fulfill(jsonResponse(bootstrap));
    if (pathname === '/fpl/event/37/live/') return route.fulfill(jsonResponse(liveEvent37));
    if (pathname === '/fpl/entry/1001/') return route.fulfill(jsonResponse(entry1001));
    if (pathname === '/fpl/entry/1001/event/37/picks/')
      return route.fulfill(jsonResponse(entry1001Picks));
    if (pathname === '/fpl/entry/1002/') return route.fulfill(jsonResponse(entry1002));
    if (pathname === '/fpl/entry/1002/event/37/picks/')
      return route.fulfill(jsonResponse(entry1002Picks));
    if (pathname === '/fpl/fixtures-slim') return route.fulfill(jsonResponse('[]'));
    if (pathname.startsWith('/fpl/')) return route.fulfill(notFoundResponse());

    return route.continue();
  });
}

Given('the Worker returns fixtures for two managers with special characters', async ({ page }) => {
  trackPageErrors(page);
  await installWorkerRoutes(page);
});

When('I open {string}', async ({ page }, path: string) => {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
});

Then('no head-to-head page error should have occurred', async ({ page }) => {
  const bag = PAGE_ERRORS.get(page);
  const messages = (bag?.errors ?? []).map((e) => `${e.name}: ${e.message}\n${e.stack ?? ''}`);
  expect(messages, `Unexpected pageerror events:\n${messages.join('\n---\n')}`).toHaveLength(0);
});

Then('the head-to-head page renders the manager names', async ({ page }) => {
  await expect(page.getByText("O'Hara", { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Müller', { exact: false }).first()).toBeVisible({ timeout: 10_000 });
});
