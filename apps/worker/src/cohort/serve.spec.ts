import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

import { type CohortServeEnv, handleCohortAggregates } from './serve';

const feature = await loadFeature('./serve.feature');

function makeKv(initial: Record<string, string> = {}): KVNamespace {
  const store = new Map(Object.entries(initial));
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  } as unknown as KVNamespace;
}

function samplePayload(playerId: number) {
  return JSON.stringify({
    captains: [{ player_id: playerId, count: 100 }],
    ownership: [{ player_id: playerId, starting_count: 800, bench_count: 50 }],
    transfers_in: [],
    transfers_out: [],
    chips: {},
    entries_sampled: 1000,
    avg_event_points: 55,
  });
}

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'GET returns the combined per-tier payload when snapshots exist',
    ({ Given, When, Then, And }) => {
      let env: CohortServeEnv;
      let response: Response;

      Given('KV holds cohort snapshots for gw 37 tiers "top_10k" and "overall"', () => {
        env = {
          FPL_CACHE: makeKv({
            'cohort:snapshot:37:top_10k': samplePayload(351),
            'cohort:snapshot:37:overall': samplePayload(328),
          }),
        };
      });
      When('I GET "/cohorts/gw37/aggregates.json"', async () => {
        response = await handleCohortAggregates(env, 37, 'GET');
      });
      Then('the response status is 200', () => {
        expect(response.status).toBe(200);
      });
      And('the JSON body has tiers "top_10k" and "overall"', async () => {
        const body: unknown = await response.json();
        expect(body).toMatchObject({
          gw: 37,
          tiers: { top_10k: expect.anything(), overall: expect.anything() },
        });
      });
    }
  );

  Scenario('GET returns 404 when no snapshots exist for the gameweek', ({ Given, When, Then }) => {
    let env: CohortServeEnv;
    let response: Response;

    Given('KV holds no cohort snapshots for gw 99', () => {
      env = { FPL_CACHE: makeKv() };
    });
    When('I GET "/cohorts/gw99/aggregates.json"', async () => {
      response = await handleCohortAggregates(env, 99, 'GET');
    });
    Then('the response status is 404', () => {
      expect(response.status).toBe(404);
    });
  });

  Scenario('HEAD returns 200 when at least one tier snapshot exists', ({ Given, When, Then }) => {
    let env: CohortServeEnv;
    let response: Response;

    Given('KV holds cohort snapshots for gw 37 tiers "top_10k"', () => {
      env = { FPL_CACHE: makeKv({ 'cohort:snapshot:37:top_10k': samplePayload(351) }) };
    });
    When('I HEAD "/cohorts/gw37/aggregates.json"', async () => {
      response = await handleCohortAggregates(env, 37, 'HEAD');
    });
    Then('the response status is 200', () => {
      expect(response.status).toBe(200);
    });
  });

  Scenario('HEAD returns 404 when no snapshot exists', ({ Given, When, Then }) => {
    let env: CohortServeEnv;
    let response: Response;

    Given('KV holds no cohort snapshots for gw 99', () => {
      env = { FPL_CACHE: makeKv() };
    });
    When('I HEAD "/cohorts/gw99/aggregates.json"', async () => {
      response = await handleCohortAggregates(env, 99, 'HEAD');
    });
    Then('the response status is 404', () => {
      expect(response.status).toBe(404);
    });
  });
});
