import { chromium } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const TARGET = process.env.HERO_TARGET ?? 'https://simplyfpl.com/';
const ENTRY_ID = process.env.HERO_ENTRY_ID ?? '219895';
const OUT = process.env.HERO_OUT ?? resolve(SCRIPT_DIR, '../public/marketing/dashboard-frozen.png');

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 880 },
  deviceScaleFactor: 2,
});

await page.addInitScript((id) => {
  window.localStorage.setItem('simplyfpl:lastEntryId', id);
}, ENTRY_ID);

await page.goto(TARGET, { waitUntil: 'networkidle' });
await page.waitForLoadState('networkidle').catch(() => undefined);
await page.waitForTimeout(4000);

await page.screenshot({ path: OUT, fullPage: false });
await browser.close();

console.log(`Captured ${TARGET} (entry ${ENTRY_ID}) -> ${OUT}`);
