import type { Page, Route } from '@playwright/test';
import { expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

const WORKER_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';
const WORKER_WS_URL = WORKER_URL.replace(/^http/, 'ws');
const STORAGE_KEY = 'simplyfpl:lastEntryId';
const SAVED_ENTRY_ID = '1';
const SNAPSHOT_DELAY_MS = 800;

const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures/fpl');

interface DelayedWsRef {
  send: () => void;
}

const WS_REFS: WeakMap<Page, DelayedWsRef> = new WeakMap();

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

async function installDelayedWorker(page: Page): Promise<void> {
  const bootstrap = readFixture('bootstrap-static.json');
  const liveEvent37 = readFixture('event-37-live.json');
  const entry1 = readFixture('entry-1.json');
  const entry1Picks = readFixture('entry-1-event-37-picks.json');
  const entry1History = readFixture('entry-1-history.json');
  const league314 = readFixture('leagues-classic-314.json');

  const snapshotPayload = JSON.stringify({
    bootstrap: JSON.parse(bootstrap),
    entry: JSON.parse(entry1),
    picks: JSON.parse(entry1Picks),
    gw: 37,
  });

  const liveSnapshotMessage = JSON.stringify({
    type: 'snapshot',
    ts: Date.now(),
    data: JSON.parse(liveEvent37),
    gw: 37,
  });

  await page.routeWebSocket(`${WORKER_WS_URL}/live/ws*`, (ws) => {
    WS_REFS.set(page, {
      send: () => {
        ws.send(liveSnapshotMessage);
      },
    });
  });

  await page.route(`${WORKER_URL}/**`, (route: Route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/fpl/bootstrap-static-slim') return route.fulfill(jsonResponse(bootstrap));
    if (/^\/snapshot\/entry\/\d+\/?$/.test(pathname)) {
      return route.fulfill(jsonResponse(snapshotPayload));
    }
    if (/^\/fpl\/event\/\d+\/live\/$/.test(pathname)) {
      const fulfill = () => route.fulfill(jsonResponse(liveEvent37));
      setTimeout(fulfill, SNAPSHOT_DELAY_MS);
      return;
    }
    if (pathname === '/fpl/entry/1/') return route.fulfill(jsonResponse(entry1));
    if (pathname === '/fpl/entry/1/event/37/picks/')
      return route.fulfill(jsonResponse(entry1Picks));
    if (pathname === '/fpl/entry/1/history/') return route.fulfill(jsonResponse(entry1History));
    if (/^\/fpl\/leagues\/\d+\/summary$/.test(pathname)) {
      return route.fulfill(jsonResponse(league314));
    }
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
        // ignore
      }
    },
    { key: STORAGE_KEY, value: entryId }
  );
}

function rankPill(page: Page) {
  return page.getByRole('link').filter({ hasText: /^\s*Rank\b/i });
}

Given(
  'the Worker returns deterministic FPL fixtures with live snapshot delayed by 800ms',
  async ({ page }) => {
    await installDelayedWorker(page);
  }
);

Given('a team id is saved in storage for the live rank loading scenario', async ({ page }) => {
  await seedStorage(page, SAVED_ENTRY_ID);
});

When('I visit the home page for the live rank loading scenario', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
});

Then('the header rank pill and the main scoreboard both show the placeholder', async ({ page }) => {
  await expect(rankPill(page)).toContainText('—', { timeout: 2000 });
  await expect(page.getByText('est. live rank', { exact: false })).toBeVisible();
  const scoreboard = page.locator('text=est. live rank').first().locator('..').locator('..');
  await expect(scoreboard).toContainText('—');
});

Then('the loading state matches the snapshot {string}', async ({ page }, name: string) => {
  await page.evaluate(() => document.fonts.ready).catch(() => undefined);
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: true,
    animations: 'disabled',
    maxDiffPixelRatio: 0.05,
  });
});

When('the live snapshot arrives', async ({ page }) => {
  const ref = WS_REFS.get(page);
  if (ref) ref.send();
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
});

Then('the header rank pill and the main scoreboard show the same live rank', async ({ page }) => {
  await expect(rankPill(page)).not.toContainText('—', { timeout: 5000 });
  const pillText = (await rankPill(page).innerText()).replace(/Rank\s*/i, '').trim();
  const scoreboard = page.locator('text=est. live rank').first().locator('..').locator('..');
  await expect(scoreboard).toContainText(pillText);
});

Then('the resolved state matches the snapshot {string}', async ({ page }, name: string) => {
  await page.evaluate(() => document.fonts.ready).catch(() => undefined);
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: true,
    animations: 'disabled',
    maxDiffPixelRatio: 0.05,
  });
});
