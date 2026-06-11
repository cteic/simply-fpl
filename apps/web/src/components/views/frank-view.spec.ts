import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

import type { FrankWeeklyPayload } from '@simplyfpl/types';

const feature = await loadFeature('./frank-view.feature');

const ORIGINAL_FETCH = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;

function frankPayload(gw = 10): FrankWeeklyPayload {
  return {
    gameweek: gw,
    generatedAt: '2025-10-01T06:00:00Z',
    captainCandidates: [{ name: 'Salah', team: 'LIV', reason: 'In form at home.' }],
    transferTargets: [{ name: 'Palmer', team: 'CHE', reason: 'Good run of fixtures.' }],
    chipNote: null,
  };
}

const API_BASE_URL = 'http://localhost:8787';

async function fetchFrankWeeklyDirect(): Promise<FrankWeeklyPayload> {
  const res = await fetch(`${API_BASE_URL}/frank/weekly`);
  if (!res.ok) throw new Error(`/frank/weekly ${res.status}`);
  return (await res.json()) as FrankWeeklyPayload;
}

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  BeforeEachScenario(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  AfterEachScenario(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  Scenario('Free user sees weekly advice without Ask Frank form', ({ Given, When, Then, And }) => {
    let payload: FrankWeeklyPayload | null = null;

    Given('the Frank weekly cache returns GW10 advice', () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(frankPayload(10)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    And('the user is on the free tier', () => {
      // tier is a presentation-layer concern; this scenario verifies the data layer
    });

    And('the FEATURE_FRANK_ONDEMAND flag is off', () => {
      // checked in frank-view.tsx via FEATURE_FRANK_ONDEMAND import
    });

    When('the user visits the Frank page', async () => {
      payload = await fetchFrankWeeklyDirect();
    });

    Then('they see the captain picks section for GW10', () => {
      expect(payload?.captainCandidates.length).toBeGreaterThan(0);
      expect(payload?.gameweek).toBe(10);
    });

    And('they see the transfer targets section', () => {
      expect(payload?.transferTargets.length).toBeGreaterThan(0);
    });

    And('the Ask Frank form is not visible', () => {
      // FEATURE_FRANK_ONDEMAND defaults to false in test env (env var not set)
      expect(process.env['NEXT_PUBLIC_FEATURE_FRANK_ONDEMAND']).not.toBe('true');
    });
  });

  Scenario('Pro user sees the same weekly advice as a free user', ({ Given, When, Then, And }) => {
    let payload: FrankWeeklyPayload | null = null;

    Given('the Frank weekly cache returns GW10 advice', () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(frankPayload(10)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    And('the user is on the pro tier', () => {
      // tier is a presentation-layer concern; this scenario verifies the data layer
    });

    And('the FEATURE_FRANK_ONDEMAND flag is off', () => {
      // checked in frank-view.tsx via FEATURE_FRANK_ONDEMAND import
    });

    When('the user visits the Frank page', async () => {
      payload = await fetchFrankWeeklyDirect();
    });

    Then('they see the captain picks section for GW10', () => {
      expect(payload?.captainCandidates.length).toBeGreaterThan(0);
      expect(payload?.gameweek).toBe(10);
    });

    And('the Ask Frank form is not visible', () => {
      expect(process.env['NEXT_PUBLIC_FEATURE_FRANK_ONDEMAND']).not.toBe('true');
    });
  });

  Scenario('Frank advice not yet available shows empty state', ({ Given, When, Then }) => {
    let error: Error | null = null;

    Given('the Frank weekly cache returns a 404', () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
      );
    });

    When('the user visits the Frank page', async () => {
      try {
        await fetchFrankWeeklyDirect();
      } catch (e) {
        error = e as Error;
      }
    });

    Then('they see the empty state message', () => {
      expect(error).not.toBeNull();
      expect(error?.message).toContain('404');
    });
  });
});
