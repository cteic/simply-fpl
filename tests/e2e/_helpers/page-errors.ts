import type { ConsoleMessage, Page } from '@playwright/test';

export interface PageErrorCollector {
  errors: string[];
}

export function collectPageErrors(page: Page): PageErrorCollector {
  const collector: PageErrorCollector = { errors: [] };

  page.on('pageerror', (err: Error) => {
    collector.errors.push(`pageerror: ${err.message}`);
  });

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      collector.errors.push(`console.error: ${msg.text()}`);
    }
  });

  return collector;
}
