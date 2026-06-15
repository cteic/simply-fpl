import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, expect } from 'vitest';

import type { CohortAggregates } from './types';
import { fetchCohortAggregates } from './use-cohort-aggregates';

const WORKER_URL = 'http://localhost:8787';

const VALID_AGGREGATES: CohortAggregates = {
  gw: 37,
  tiers: {
    top_10k: {
      captains: [{ player_id: 351, count: 820 }],
      ownership: [{ player_id: 351, starting_count: 780, bench_count: 20 }],
      transfers_in: [],
      transfers_out: [],
      chips: {},
      entries_sampled: 1000,
      avg_event_points: 58,
    },
    overall: {
      captains: [],
      ownership: [],
      transfers_in: [],
      transfers_out: [],
      chips: {},
      entries_sampled: 2000,
      avg_event_points: 52,
    },
  },
};

type MockBehavior = 'success' | 'not-found' | 'network-error';
let mockBehavior: MockBehavior = 'success';

const server = setupServer(
  http.get(`${WORKER_URL}/cohorts/gw37/aggregates.json`, () => {
    if (mockBehavior === 'not-found') return new HttpResponse(null, { status: 404 });
    if (mockBehavior === 'network-error') return HttpResponse.error();
    return HttpResponse.json(VALID_AGGREGATES);
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const feature = await loadFeature('./use-cohort-aggregates.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'Returns parsed aggregates when the Worker responds with valid data',
    ({ Given, When, Then }) => {
      let result: CohortAggregates | null;

      Given('the Worker returns valid cohort aggregates for gameweek 37', () => {
        mockBehavior = 'success';
      });

      When('fetchCohortAggregates is called for gameweek 37', async () => {
        result = await fetchCohortAggregates(37, WORKER_URL);
      });

      Then('the returned data contains avg_event_points for the top_10k tier', () => {
        expect(result).not.toBeNull();
        expect(result?.tiers.top_10k?.avg_event_points).toBe(58);
      });
    }
  );

  Scenario('Returns null when the Worker responds with a 404', ({ Given, When, Then }) => {
    let result: CohortAggregates | null;

    Given('the Worker returns 404 for the cohort aggregates endpoint', () => {
      mockBehavior = 'not-found';
    });

    When('fetchCohortAggregates is called for gameweek 37', async () => {
      result = await fetchCohortAggregates(37, WORKER_URL);
    });

    Then('the returned data is null', () => {
      expect(result).toBeNull();
    });
  });

  Scenario('Returns null on a network error', ({ Given, When, Then }) => {
    let result: CohortAggregates | null;

    Given('the Worker is unreachable', () => {
      mockBehavior = 'network-error';
    });

    When('fetchCohortAggregates is called for gameweek 37', async () => {
      result = await fetchCohortAggregates(37, WORKER_URL);
    });

    Then('the returned data is null', () => {
      expect(result).toBeNull();
    });
  });
});
