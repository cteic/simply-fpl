import type { Page, Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WORKER_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';
const WORKER_WS_URL = WORKER_URL.replace(/^http/, 'ws');

const FIXTURES_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../apps/web/e2e/fixtures/fpl'
);

function readFixture(name: string): string {
  return readFileSync(resolve(FIXTURES_DIR, name), 'utf8');
}

function jsonResponse(body: string) {
  return { status: 200, contentType: 'application/json', body } as const;
}

const KIT_PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="110" height="110">' +
  '<path d="M8 8h12l2 4v8H6v-8l2-4z" fill="#9CA3AF"/>' +
  '<path d="M11 8v12M17 8v12" stroke="white" stroke-width="1.3"/>' +
  '</svg>';

function kitPlaceholderResponse() {
  return { status: 200, contentType: 'image/svg+xml', body: KIT_PLACEHOLDER_SVG } as const;
}

export async function installWorkerMocks(page: Page): Promise<void> {
  const bootstrap = readFixture('bootstrap-static.json');
  const liveEvent37 = readFixture('event-37-live.json');
  const entry1 = readFixture('entry-1.json');
  const entry1Picks = readFixture('entry-1-event-37-picks.json');
  const entry1History = readFixture('entry-1-history.json');
  const league314 = readFixture('leagues-classic-314.json');

  const statusPayload = JSON.stringify({
    worker: 'ok',
    kv: 'ok',
    fpl: 'ok',
    durable_object: 'ok',
    version: 'test-1.0.0',
    timestamp: '2026-05-15T23:00:00.000Z',
  });

  const snapshotPayload = JSON.stringify({
    bootstrap: JSON.parse(bootstrap),
    entry: JSON.parse(entry1),
    picks: JSON.parse(entry1Picks),
    gw: 37,
  });

  await page.routeWebSocket(`${WORKER_WS_URL}/live/ws*`, (ws) => {
    ws.send(
      JSON.stringify({
        type: 'snapshot',
        ts: Date.now(),
        elements: [],
        gw: 37,
      })
    );
  });

  await page.route(`${WORKER_URL}/**`, (route: Route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (pathname === '/status') return route.fulfill(jsonResponse(statusPayload));
    if (pathname === '/fpl/bootstrap-static/') return route.fulfill(jsonResponse(bootstrap));
    if (/^\/fpl\/event\/\d+\/live\/$/.test(pathname)) {
      return route.fulfill(jsonResponse(liveEvent37));
    }
    if (/^\/snapshot\/entry\/\d+\/?$/.test(pathname)) {
      return route.fulfill(jsonResponse(snapshotPayload));
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
    if (/^\/fpl\/leagues-classic\/\d+\/standings\/$/.test(pathname)) {
      return route.fulfill(jsonResponse(league314));
    }
    if (pathname === '/fpl/fixtures/') return route.fulfill(jsonResponse('[]'));
    if (pathname.startsWith('/kits/')) return route.fulfill(kitPlaceholderResponse());
    if (pathname.startsWith('/cohorts/')) return route.fulfill({ status: 404, body: 'not found' });

    return route.continue();
  });
}
