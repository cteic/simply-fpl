import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Then } = createBdd();

Then('the dashboard container applies proximity snap-scroll', async ({ page }) => {
  const container = page.getByTestId('home-unified-dashboard-scroll');
  await expect(container).toBeVisible();
  const snapType = await container.evaluate((el) => window.getComputedStyle(el).scrollSnapType);
  expect(snapType.startsWith('y'), `expected y-axis snap, got "${snapType}"`).toBe(true);
  expect(
    snapType.includes('mandatory'),
    `expected proximity (not mandatory), got "${snapType}"`
  ).toBe(false);
});

Then('each dashboard section opts into start-aligned snap', async ({ page }) => {
  for (const id of ['live-rank', 'effective-ownership', 'threats', 'rivals']) {
    const section = page.locator(`#${id}`);
    await expect(section, `section #${id} not in DOM`).toHaveCount(1);
    const align = await section.evaluate((el) => window.getComputedStyle(el).scrollSnapAlign);
    expect(align, `section #${id} expected scroll-snap-align start, got "${align}"`).toBe('start');
  }
});

Then('the live-rank section fills the mobile viewport', async ({ page }) => {
  const section = page.locator('#live-rank');
  const viewport = page.viewportSize();
  expect(viewport, 'expected a viewport size for mobile snap check').not.toBeNull();
  const minHeightPx = await section.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return parseFloat(cs.minHeight || '0');
  });
  if (viewport) {
    expect(
      minHeightPx,
      `live-rank min-height ${minHeightPx}px should be near viewport height ${viewport.height}px`
    ).toBeGreaterThanOrEqual(viewport.height * 0.9);
  }
});
