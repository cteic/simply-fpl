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
const RENDER_TIMEOUT_MS = 20_000;
const FRAME_INTERVAL_MS = 60;
const FULL_TIME_GW_POINTS = '87';

const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures/fpl');
const RECORDING_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../packages/features/src/live-rank/__fixtures__/simulator/gw37/recording.jsonl'
);

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

interface ReplayFrame {
  ts: string;
  gw: number;
  data: { elements: unknown[] };
}

function loadRecordingFrames(): ReplayFrame[] {
  const text = readFileSync(RECORDING_PATH, 'utf8');
  const frames: ReplayFrame[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parsed: ReplayFrame = JSON.parse(trimmed);
    if (
      parsed &&
      typeof parsed.ts === 'string' &&
      parsed.data &&
      Array.isArray(parsed.data.elements)
    ) {
      frames.push(parsed);
    }
  }
  return frames;
}

Given('a team id is saved in storage for the simulator', async ({ page }) => {
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

Given('the worker serves deterministic FPL fixtures for the simulator', async ({ page }) => {
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
    if (pathname === '/fpl/bootstrap-static/') return route.fulfill(jsonResponse(bootstrap));
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
    if (pathname === '/fpl/fixtures/') return route.fulfill(jsonResponse('[]'));
    if (pathname.startsWith('/fpl/')) return route.fulfill(notFoundResponse());

    return route.continue();
  });
});

Given('the simulator is replaying the gw37 recording over the live websocket', async ({ page }) => {
  const frames = loadRecordingFrames();
  await page.routeWebSocket(`${WORKER_WS_URL}/live/ws*`, (ws) => {
    void (async () => {
      for (const frame of frames) {
        ws.send(JSON.stringify({ type: 'snapshot', data: frame.data, ts: Date.now() }));
        await new Promise((done) => setTimeout(done, FRAME_INTERVAL_MS));
      }
    })();
  });
});

When('I open the live-rank page for the simulator', async ({ page }: { page: Page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
});

Then('the live-rank surface renders my replayed team', async ({ page }) => {
  await expect(page.getByText('Live Rank').first()).toBeVisible({ timeout: RENDER_TIMEOUT_MS });
  await expect(page.getByText('est. live rank').first()).toBeVisible({
    timeout: RENDER_TIMEOUT_MS,
  });
  await expect(page.getByText('Raya').first()).toBeVisible({ timeout: RENDER_TIMEOUT_MS });
});

Then('the gameweek points climb to the recorded full-time total', async ({ page }) => {
  await expect(page.getByText(FULL_TIME_GW_POINTS).first()).toBeVisible({
    timeout: RENDER_TIMEOUT_MS,
  });
});
