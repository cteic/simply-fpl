import type { NextRequest } from 'next/server';

import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import type { Mock } from 'vitest';
import { expect, vi } from 'vitest';

const feature = await loadFeature('./frank-ask.feature');

const FAKE_USER_ID = 'user-frank-1';

interface FrankRow {
  id: string;
  user_id: string;
  question: string;
  response?: unknown;
  model?: string;
  tokens_in?: number;
  tokens_out?: number;
}

type AnyMock = Mock<(...args: unknown[]) => unknown>;
let frankRows: FrankRow[];
let nextRowId: number;
let mockAnthropicCreate: AnyMock;

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = {
      create: (...args: unknown[]) => mockAnthropicCreate(...args),
    };
  }
  return { default: MockAnthropic };
});

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: () =>
    Promise.resolve({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: FAKE_USER_ID } } }),
      },
      from: (_table: string) => ({
        select: (_cols: string) => ({
          eq: (_col: string, _val: string) => ({
            maybeSingle: () =>
              Promise.resolve({ data: { tier: 'ultimate', fpl_entry_id: null }, error: null }),
          }),
        }),
      }),
    }),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdminClient: () => ({
    from: (_table: string) => ({
      select: (_cols: string, _opts: { count: string; head: boolean }) => ({
        eq: (_col: string, userId: string) => ({
          gte: (_dateCol: string, _iso: string) =>
            Promise.resolve({
              count: frankRows.filter((row) => row.user_id === userId).length,
              error: null,
            }),
        }),
      }),
      insert: (row: { user_id: string; question: string }) => ({
        select: (_cols: string) => ({
          single: () => {
            const created: FrankRow = { id: `row-${nextRowId++}`, ...row };
            frankRows.push(created);
            return Promise.resolve({ data: { id: created.id }, error: null });
          },
        }),
      }),
      update: (data: Partial<FrankRow>) => ({
        eq: (_col: string, id: string) => {
          const row = frankRows.find((candidate) => candidate.id === id);
          if (row) Object.assign(row, data);
          return Promise.resolve({ error: null });
        },
      }),
      delete: () => ({
        eq: (_col: string, id: string) => {
          frankRows = frankRows.filter((candidate) => candidate.id !== id);
          return Promise.resolve({ error: null });
        },
      }),
    }),
  }),
}));

function makeAnthropicMessage() {
  return {
    content: [{ type: 'text', text: JSON.stringify({ advice: 'Captain Salah.' }) }],
    usage: { input_tokens: 10, output_tokens: 20 },
  };
}

function makeRequest(question = 'Who should I captain?') {
  return {
    json: () => Promise.resolve({ question }),
  } as unknown as NextRequest;
}

function seedRows(count: number) {
  for (let i = 0; i < count; i++) {
    frankRows.push({ id: `seed-${i}`, user_id: FAKE_USER_ID, question: 'seeded' });
  }
}

async function importRoute() {
  vi.resetModules();
  return import('./route');
}

describeFeature(feature, ({ Scenario, BeforeEachScenario }) => {
  BeforeEachScenario(() => {
    frankRows = [];
    nextRowId = 1;
    mockAnthropicCreate = vi.fn().mockResolvedValue(makeAnthropicMessage());
    vi.stubEnv('FEATURE_FRANK_ONDEMAND', 'true');
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  });

  Scenario(
    'a user under quota gets an answer and the reservation stores the response',
    ({ Given, When, Then, And }) => {
      let response: Response | null = null;

      Given('a signed-in Ultimate user with 0 queries this month', () => {
        seedRows(0);
      });

      When('they ask Frank a question', async () => {
        const { POST } = await importRoute();
        response = await POST(makeRequest());
      });

      Then("the response contains Frank's advice", async () => {
        expect(response?.status).toBe(200);
        const body: unknown = await response?.json();
        expect(body).toMatchObject({ advice: 'Captain Salah.', used: 1 });
      });

      And('exactly one AI call is made', () => {
        expect(mockAnthropicCreate).toHaveBeenCalledTimes(1);
      });

      And('the stored query row contains the response', () => {
        expect(frankRows).toHaveLength(1);
        expect(frankRows[0]?.response).toMatchObject({ advice: 'Captain Salah.' });
      });
    }
  );

  Scenario(
    'a user at the hard cap is rejected without an AI call',
    ({ Given, When, Then, And }) => {
      let response: Response | null = null;

      Given('a signed-in Ultimate user with 80 queries this month', () => {
        seedRows(80);
      });

      When('they ask Frank a question', async () => {
        const { POST } = await importRoute();
        response = await POST(makeRequest());
      });

      Then('the response status is 429', () => {
        expect(response?.status).toBe(429);
      });

      And('no AI call is made', () => {
        expect(mockAnthropicCreate).not.toHaveBeenCalled();
      });
    }
  );

  Scenario(
    'concurrent asks at the quota boundary never spend past the hard cap',
    ({ Given, When, Then, And }) => {
      let responses: Response[] = [];

      Given('a signed-in Ultimate user with 79 queries this month', () => {
        seedRows(79);
      });

      When('they ask Frank two questions concurrently', async () => {
        const { POST } = await importRoute();
        responses = await Promise.all([POST(makeRequest()), POST(makeRequest())]);
      });

      Then('at most one AI call is made', () => {
        expect(mockAnthropicCreate.mock.calls.length).toBeLessThanOrEqual(1);
      });

      And('at least one response status is 429', () => {
        const statuses = responses.map((res) => res.status);
        expect(statuses).toContain(429);
      });
    }
  );

  Scenario('an AI service failure releases the quota reservation', ({ Given, And, When, Then }) => {
    let response: Response | null = null;

    Given('a signed-in Ultimate user with 0 queries this month', () => {
      seedRows(0);
    });

    And('the AI service is failing', () => {
      mockAnthropicCreate = vi.fn().mockRejectedValue(new Error('overloaded'));
    });

    When('they ask Frank a question', async () => {
      const { POST } = await importRoute();
      response = await POST(makeRequest());
    });

    Then('the response status is 503', () => {
      expect(response?.status).toBe(503);
    });

    And('no query rows remain for the user', () => {
      expect(frankRows).toHaveLength(0);
    });
  });
});
