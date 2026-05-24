import type { Page, Route } from '@playwright/test';
import { expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

const WORKER_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';
const WORKER_WS_URL = WORKER_URL.replace(/^http/i, 'ws');
const STORAGE_KEY = 'simplyfpl:lastEntryId';
const SAVED_ENTRY_ID = '1';
const FALLBACK_TIMEOUT_MS = 15_000;

const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures/fpl');

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

Given('a team id is saved in storage for fallback', async ({ page }) => {
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // ignore storage errors in test contexts
      }
    },
    { key: STORAGE_KEY, value: SAVED_ENTRY_ID }
  );
});

Given('the Worker WebSocket upgrade fails for every attempt', async ({ page }) => {
  await page.routeWebSocket(`${WORKER_WS_URL}/live/ws*`, (ws) => {
    ws.close();
  });
});

Given('the Worker returns deterministic FPL fixtures for fallback', async ({ page }) => {
  const bootstrap = readFixture('bootstrap-static.json');
  const liveEvent37 = readFixture('event-37-live.json');
  const entry1 = readFixture('entry-1.json');
  const entry1Picks = readFixture('entry-1-event-37-picks.json');
  const entry1History = readFixture('entry-1-history.json');

  const snapshotPayload = JSON.stringify({
    bootstrap: JSON.parse(bootstrap),
    entry: JSON.parse(entry1),
    picks: JSON.parse(entry1Picks),
    gw: 37,
  });

  await page.route(`${WORKER_URL}/**`, (route: Route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (/^\/snapshot\/entry\/\d+\/?$/.test(pathname)) {
      return route.fulfill(jsonResponse(snapshotPayload));
    }
    if (pathname === '/fpl/bootstrap-static-slim') return route.fulfill(jsonResponse(bootstrap));
    if (/^\/fpl\/event\/\d+\/live\/$/.test(pathname)) {
      return route.fulfill(jsonResponse(liveEvent37));
    }
    if (/^\/fpl\/entry\/\d+\/event\/\d+\/picks\/$/.test(pathname)) {
      return route.fulfill(jsonResponse(entry1Picks));
    }
    if (/^\/fpl\/entry\/\d+\/history\/$/.test(pathname)) {
      return route.fulfill(jsonResponse(entry1History));
    }
    if (/^\/fpl\/entry\/\d+\/$/.test(pathname)) {
      return route.fulfill(jsonResponse(entry1));
    }
    if (pathname === '/fpl/fixtures-slim') return route.fulfill(jsonResponse('[]'));
    if (pathname.startsWith('/fpl/')) return route.fulfill(notFoundResponse());

    return route.continue();
  });
});

When('I visit the home page for fallback', async ({ page }: { page: Page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
});

Then('the live-rank surface should render my picks via HTTP fallback', async ({ page }) => {
  await expect(page.getByText('Live Rank').first()).toBeVisible({ timeout: FALLBACK_TIMEOUT_MS });
  await expect(page.getByText('Raya').first()).toBeVisible({ timeout: FALLBACK_TIMEOUT_MS });
  const liveRequests = await page.evaluate(() => {
    const entries = performance.getEntriesByType('resource');
    return entries
      .map((entry) => entry.name)
      .filter((name) => /\/fpl\/event\/\d+\/live\//.test(name));
  });
  expect(liveRequests.length).toBeGreaterThan(0);
});
