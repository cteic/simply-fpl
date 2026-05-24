import type { Route } from '@playwright/test';
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

const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures');
const FPL_FIXTURES_DIR = resolve(FIXTURES_DIR, 'fpl');

function readFplFixture(name: string): string {
  return readFileSync(resolve(FPL_FIXTURES_DIR, name), 'utf8');
}

function readReplayFixture(name: string): string {
  return readFileSync(resolve(FIXTURES_DIR, 'replay', name), 'utf8');
}

interface ReplayRow {
  ts: string;
  gw: number;
  data: { elements: unknown[] };
}

function parseNdjson(text: string): ReplayRow[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as ReplayRow);
}

function makeSnapshotMessage(row: ReplayRow): string {
  return JSON.stringify({
    type: 'snapshot',
    ts: Date.parse(row.ts),
    data: row.data,
    gw: row.gw,
  });
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

Given('a team id is saved in storage for the replay scenario', async ({ page }) => {
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

Given(
  'the Worker is mocked with replay recording {string}',
  async ({ page }, recordingFile: string) => {
    const bootstrap = JSON.parse(readFplFixture('bootstrap-static.json'));
    const entry = readFplFixture('entry-1.json');
    const picks = readFplFixture('entry-1-event-37-picks.json');

    const snapshotPayload = JSON.stringify({
      bootstrap,
      entry: JSON.parse(entry),
      picks: JSON.parse(picks),
      gw: 37,
    });

    const frames = parseNdjson(readReplayFixture(recordingFile));

    await page.routeWebSocket(`${WORKER_WS_URL}/live/ws*`, (ws) => {
      let delayMs = 400;
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        if (!frame) continue;
        const d = delayMs;
        const msg = makeSnapshotMessage(frame);
        setTimeout(() => {
          ws.send(msg);
        }, d);
        delayMs += 300;
      }
    });

    await page.route(`${WORKER_URL}/**`, (route: Route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (/^\/snapshot\/entry\/\d+\/?$/.test(pathname)) {
        return route.fulfill(jsonResponse(snapshotPayload));
      }
      if (pathname === '/fpl/bootstrap-static-slim') {
        return route.fulfill(jsonResponse(JSON.stringify(bootstrap)));
      }
      if (/^\/fpl\/event\/\d+\/live\/$/.test(pathname)) {
        const first = frames[0];
        return route.fulfill(jsonResponse(JSON.stringify(first ? first.data : { elements: [] })));
      }
      if (pathname === '/fpl/fixtures-slim') return route.fulfill(jsonResponse('[]'));
      if (pathname.startsWith('/fpl/')) return route.fulfill(notFoundResponse());
      return route.fulfill(notFoundResponse());
    });
  }
);

When('I open the live-rank view for the replay scenario', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
});

Then('the GW points tile should change across at least two replayed frames', async ({ page }) => {
  const gwPointsTile = page.getByText('GW Points').first().locator('..');

  await expect(gwPointsTile).not.toContainText('—', { timeout: 10_000 });
  const afterFirstFrame = await gwPointsTile.innerText();
  const firstPoints = parseInt(afterFirstFrame.replace(/\D/g, ''), 10);
  expect(firstPoints).toBeGreaterThan(0);

  await expect(gwPointsTile).not.toContainText(String(firstPoints), { timeout: 5_000 });
  const afterSecondFrame = await gwPointsTile.innerText();
  const secondPoints = parseInt(afterSecondFrame.replace(/\D/g, ''), 10);
  expect(secondPoints).toBeGreaterThan(firstPoints);
});
