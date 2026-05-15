import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { HttpResponse, http } from 'msw';
import { afterAll, afterEach, beforeAll, expect } from 'vitest';

import type { FplBootstrapStatic, FplEntry, FplLiveGameweek } from '@simplyfpl/types';

import { createFplClient } from './client';
import { server } from './test/server';

const feature = await loadFeature('./client.feature');

const BASE = 'http://localhost:8787';
const client = createFplClient({ baseUrl: BASE });

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describeFeature(feature, ({ Scenario }) => {
  Scenario('Fetch bootstrap static data via Worker proxy', ({ Given, When, Then }) => {
    let result: FplBootstrapStatic;

    Given('the Worker proxy is returning bootstrap static data', () => {});

    When('I call getBootstrapStatic', async () => {
      result = await client.getBootstrapStatic();
    });

    Then('I receive a response containing events and elements', () => {
      expect(Array.isArray(result.events)).toBe(true);
      expect(Array.isArray(result.elements)).toBe(true);
      expect(result.events.length).toBeGreaterThan(0);
    });
  });

  Scenario('Fetch live gameweek data via Worker proxy', ({ Given, When, Then }) => {
    let result: FplLiveGameweek;

    Given('the Worker proxy is returning live gameweek data for event 1', () => {});

    When('I call getLiveGameweek for event 1', async () => {
      result = await client.getLiveGameweek(1);
    });

    Then('I receive live element scores', () => {
      expect(Array.isArray(result.elements)).toBe(true);
      expect(result.elements.length).toBeGreaterThan(0);
    });
  });

  Scenario('Fetch manager entry via Worker proxy', ({ Given, When, Then }) => {
    let result: FplEntry;

    Given('the Worker proxy is returning entry data for manager 12345', () => {});

    When('I call getEntry for manager 12345', async () => {
      result = await client.getEntry(12345);
    });

    Then('I receive the manager name and overall rank', () => {
      expect(result.player_first_name).toBeDefined();
      expect(result.summary_overall_rank).toBeGreaterThan(0);
    });
  });

  Scenario('Failed request throws a descriptive error', ({ Given, When, Then }) => {
    let caughtError: Error | null = null;

    Given('the Worker proxy returns a 500 error', () => {});

    When('I call getBootstrapStatic and it fails', async () => {
      server.use(
        http.get(`${BASE}/fpl/bootstrap-static/`, () => new HttpResponse(null, { status: 500 }))
      );
      try {
        await client.getBootstrapStatic();
      } catch (e) {
        caughtError = e instanceof Error ? e : new Error(String(e));
      }
    });

    Then('an error containing the status code is thrown', () => {
      expect(caughtError).not.toBeNull();
      expect(caughtError?.message).toMatch('500');
    });
  });
});
