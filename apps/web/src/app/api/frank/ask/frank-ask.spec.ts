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
let mockAnthropicStream: AnyMock;
let cacheHit: boolean;
let budgetReserved: number;
let budgetUnavailable: boolean;
let profileTier: 'free' | 'pro' | 'ultimate';

class MockMessageStream implements AsyncIterable<unknown> {
  constructor(
    private readonly chunks: string[],
    private readonly usage = { input_tokens: 10, output_tokens: 20 }
  ) {}

  async *[Symbol.asyncIterator]() {
    for (const text of this.chunks) {
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text } };
    }
  }

  async finalMessage() {
    const text = this.chunks.join('');
    return {
      content: [{ type: 'text', text }],
      usage: this.usage,
    };
  }
}

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = {
      stream: (...args: unknown[]) => mockAnthropicStream(...args),
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
              Promise.resolve({ data: { tier: profileTier, fpl_entry_id: null }, error: null }),
          }),
        }),
      }),
    }),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdminClient: () => ({
    // Stands in for the two budget functions with the same semantics: reserve
    // adds only when the result stays within the cap.
    rpc: (fn: string, args: { p_tokens?: number; p_cap?: number; p_delta?: number }) => {
      if (budgetUnavailable) return Promise.resolve({ data: null, error: { code: 'PGRST202' } });
      if (fn === 'frank_reserve_tokens') {
        const tokens = args.p_tokens ?? 0;
        if (budgetReserved + tokens > (args.p_cap ?? 0)) {
          return Promise.resolve({ data: false, error: null });
        }
        budgetReserved += tokens;
        return Promise.resolve({ data: true, error: null });
      }
      budgetReserved = Math.max(0, budgetReserved + (args.p_delta ?? 0));
      return Promise.resolve({ data: null, error: null });
    },
    from: (_table: string) => ({
      select: (_cols: string, _opts?: { count: string; head: boolean }) => ({
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

function makeStreamChunks(json: string): string[] {
  return [json];
}

function makeDefaultStream() {
  return new MockMessageStream(makeStreamChunks(JSON.stringify({ advice: 'Captain Salah.' })));
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

async function drainStream(response: Response): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value);
  }
  return result;
}

function parseSseEvents(raw: string): Array<{ event: string; data: unknown }> {
  const events: Array<{ event: string; data: unknown }> = [];
  for (const block of raw.split('\n\n')) {
    let eventName = '';
    let dataStr = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) eventName = line.slice(7).trim();
      else if (line.startsWith('data: ')) dataStr = line.slice(6);
    }
    if (eventName && dataStr) {
      try {
        events.push({ event: eventName, data: JSON.parse(dataStr) as unknown });
      } catch {
        // ignore
      }
    }
  }
  return events;
}

describeFeature(feature, ({ Scenario, BeforeEachScenario }) => {
  BeforeEachScenario(() => {
    frankRows = [];
    nextRowId = 1;
    cacheHit = false;
    budgetReserved = 0;
    budgetUnavailable = false;
    profileTier = 'ultimate';
    vi.stubEnv('FEATURE_FRANK_FREE_TIER', '');
    vi.stubEnv('FRANK_DAILY_SPEND_CAP_TOKENS', '');
    mockAnthropicStream = vi.fn().mockReturnValue(makeDefaultStream());
    vi.stubEnv('FEATURE_FRANK_ONDEMAND', 'true');
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (String(url).includes('/frank/ask-cache')) {
          if (cacheHit) {
            return Promise.resolve(
              new Response(JSON.stringify({ advice: 'Cached advice.', follow_up_question: null }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              })
            );
          }
          return Promise.resolve(new Response('not found', { status: 404 }));
        }
        return Promise.resolve(new Response('', { status: 404 }));
      })
    );
  });

  Scenario(
    'a user under quota gets an answer and the reservation stores the response',
    ({ Given, When, Then, And }) => {
      let response: Response | null = null;
      let sseText = '';

      Given('a signed-in Ultimate user with 0 queries this month', () => {
        seedRows(0);
      });

      When('they ask Frank a question', async () => {
        const { POST } = await importRoute();
        response = await POST(makeRequest());
        sseText = await drainStream(response);
      });

      Then('the response is a stream', () => {
        expect(response?.headers.get('content-type')).toContain('text/event-stream');
      });

      And("the stream contains a done event with Frank's advice", () => {
        const events = parseSseEvents(sseText);
        const done = events.find((e) => e.event === 'done');
        expect(done).toBeDefined();
        expect((done?.data as { advice: string }).advice).toBe('Captain Salah.');
      });

      And('exactly one AI call is made', () => {
        expect(mockAnthropicStream).toHaveBeenCalledTimes(1);
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
        expect(mockAnthropicStream).not.toHaveBeenCalled();
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
        const [r1, r2] = await Promise.all([POST(makeRequest()), POST(makeRequest())]);
        responses = [r1, r2];
        for (const r of responses) {
          if (r.headers.get('content-type')?.includes('text/event-stream')) {
            await drainStream(r);
          }
        }
      });

      Then('at most one AI call is made', () => {
        expect(mockAnthropicStream.mock.calls.length).toBeLessThanOrEqual(1);
      });

      And('at least one response status is 429', () => {
        const statuses = responses.map((res) => res.status);
        expect(statuses).toContain(429);
      });
    }
  );

  Scenario('an AI service failure releases the quota reservation', ({ Given, And, When, Then }) => {
    let response: Response | null = null;
    let sseText = '';

    Given('a signed-in Ultimate user with 0 queries this month', () => {
      seedRows(0);
    });

    And('the AI service is failing', () => {
      mockAnthropicStream = vi.fn().mockReturnValue({
        async *[Symbol.asyncIterator]() {
          throw new Error('overloaded');
        },
        finalMessage: () => Promise.reject(new Error('overloaded')),
      });
    });

    When('they ask Frank a question', async () => {
      const { POST } = await importRoute();
      response = await POST(makeRequest());
      sseText = await drainStream(response);
    });

    Then('the response is a stream', () => {
      expect(response?.headers.get('content-type')).toContain('text/event-stream');
    });

    And('the stream contains an error event', () => {
      const events = parseSseEvents(sseText);
      expect(events.some((e) => e.event === 'error')).toBe(true);
    });

    And('no query rows remain for the user', () => {
      expect(frankRows).toHaveLength(0);
    });
  });

  Scenario(
    'a cached answer is returned as JSON without an AI call',
    ({ Given, And, When, Then }) => {
      let response: Response | null = null;

      Given('a signed-in Ultimate user with 0 queries this month', () => {
        seedRows(0);
      });

      And('the ask-cache has a stored answer for the question', () => {
        cacheHit = true;
      });

      When('they ask Frank a question', async () => {
        const { POST } = await importRoute();
        response = await POST(makeRequest());
      });

      Then('the response is JSON', () => {
        expect(response?.headers.get('content-type')).toContain('application/json');
      });

      And('no AI call is made', () => {
        expect(mockAnthropicStream).not.toHaveBeenCalled();
      });
    }
  );

  Scenario('a cache miss triggers a streaming response', ({ Given, And, When, Then }) => {
    let response: Response | null = null;
    let sseText = '';

    Given('a signed-in Ultimate user with 0 queries this month', () => {
      seedRows(0);
    });

    And('the ask-cache has no stored answer', () => {
      cacheHit = false;
    });

    When('they ask Frank a question', async () => {
      const { POST } = await importRoute();
      response = await POST(makeRequest());
      sseText = await drainStream(response);
    });

    Then('the response is a stream', () => {
      expect(response?.headers.get('content-type')).toContain('text/event-stream');
    });

    And("the stream contains a done event with Frank's advice", () => {
      const events = parseSseEvents(sseText);
      const done = events.find((e) => e.event === 'done');
      expect(done).toBeDefined();
      expect((done?.data as { advice: string }).advice).toBeTruthy();
    });

    And('exactly one AI call is made', () => {
      expect(mockAnthropicStream).toHaveBeenCalledTimes(1);
    });
  });

  Scenario(
    'an answer that cannot be parsed is not written to the shared cache',
    ({ Given, And, When, Then }) => {
      Given('a signed-in Ultimate user with 0 queries this month', () => {
        seedRows(0);
        vi.stubEnv('FRANK_CACHE_WRITE_SECRET', 'cache-secret');
      });

      And('the model replies with text that is not JSON', () => {
        mockAnthropicStream = vi
          .fn()
          .mockReturnValue(new MockMessageStream(['```json\n{"advice": "Captain Salah."}\n```']));
      });

      When('they ask Frank a question', async () => {
        const { POST } = await importRoute();
        await drainStream(await POST(makeRequest()));
      });

      Then('the ask-cache is never written', () => {
        const fetchMock = vi.mocked(fetch);
        const cacheWrites = fetchMock.mock.calls.filter(
          ([url, init]) => String(url).includes('/frank/ask-cache') && init?.method === 'PUT'
        );
        expect(cacheWrites).toHaveLength(0);
      });
    }
  );

  Scenario(
    'a client that disconnects mid-stream keeps its quota reservation',
    ({ Given, When, Then }) => {
      Given('a signed-in Ultimate user with 0 queries this month', () => {
        seedRows(0);
      });

      When('they ask Frank a question and close the stream straight away', async () => {
        const { POST } = await importRoute();
        const response = await POST(makeRequest());
        await response.body?.cancel();
        await vi.waitFor(() => {
          expect(frankRows[0]?.tokens_out).toBeDefined();
        });
      });

      Then('the reservation stays and records the token usage', () => {
        expect(frankRows).toHaveLength(1);
        expect(frankRows[0]?.tokens_in).toBe(10);
        expect(frankRows[0]?.tokens_out).toBe(20);
      });
    }
  );

  Scenario(
    'the daily budget ends up holding what the answer really cost',
    ({ Given, When, Then }) => {
      Given('a signed-in Ultimate user with 0 queries this month', () => {
        seedRows(0);
      });

      When('they ask Frank a question', async () => {
        const { POST } = await importRoute();
        await drainStream(await POST(makeRequest()));
      });

      Then('the daily budget holds the tokens the answer used', () => {
        // The mock stream reports 10 tokens in and 20 out. The 6,000-token
        // estimate reserved up front must be replaced by that, not added to it.
        expect(budgetReserved).toBe(30);
      });
    }
  );

  Scenario(
    'a request the daily budget cannot cover makes no AI call',
    ({ Given, And, When, Then }) => {
      let response: Response | null = null;
      let body: { advice?: string } = {};

      Given('a signed-in Ultimate user with 0 queries this month', () => {
        seedRows(0);
      });

      And('the daily token budget is nearly spent', () => {
        vi.stubEnv('FRANK_DAILY_SPEND_CAP_TOKENS', '10000');
        budgetReserved = 9000;
      });

      When('they ask Frank a question', async () => {
        const { POST } = await importRoute();
        response = await POST(makeRequest());
        body = (await response.json()) as { advice?: string };
      });

      Then('no AI call is made', () => {
        expect(mockAnthropicStream).not.toHaveBeenCalled();
      });

      And('the reply says the daily budget is reached', () => {
        expect(body.advice).toContain('Daily AI budget reached');
      });

      And('no quota row is left behind', () => {
        // The question was never answered, so it must not count against the
        // user's monthly allowance, and the budget must be untouched.
        expect(frankRows).toHaveLength(0);
        expect(budgetReserved).toBe(9000);
      });
    }
  );

  Scenario('concurrent asks cannot spend past the daily budget', ({ Given, And, When, Then }) => {
    Given('a signed-in Ultimate user with 0 queries this month', () => {
      seedRows(0);
    });

    And('the daily token budget has room for exactly one question', () => {
      vi.stubEnv('FRANK_DAILY_SPEND_CAP_TOKENS', '6000');
    });

    When('they ask Frank two questions concurrently', async () => {
      const { POST } = await importRoute();
      const responses = await Promise.all([POST(makeRequest('one?')), POST(makeRequest('two?'))]);
      await Promise.all(
        responses.map((r) =>
          r.headers.get('content-type')?.includes('text/event-stream') ? drainStream(r) : r.text()
        )
      );
    });

    Then('exactly one AI call is made', () => {
      expect(mockAnthropicStream).toHaveBeenCalledTimes(1);
    });
  });

  Scenario('an AI failure hands the daily reservation back', ({ Given, And, When, Then }) => {
    Given('a signed-in Ultimate user with 0 queries this month', () => {
      seedRows(0);
    });

    And('the AI service is failing', () => {
      mockAnthropicStream = vi.fn().mockImplementation(() => {
        throw new Error('upstream down');
      });
    });

    When('they ask Frank a question', async () => {
      const { POST } = await importRoute();
      await drainStream(await POST(makeRequest()));
    });

    Then('the daily budget holds nothing', () => {
      expect(budgetReserved).toBe(0);
    });
  });

  Scenario(
    'Frank still answers when the budget function is not deployed',
    ({ Given, And, When, Then }) => {
      Given('a signed-in Ultimate user with 0 queries this month', () => {
        seedRows(0);
      });

      And('the budget function is unavailable', () => {
        budgetUnavailable = true;
      });

      When('they ask Frank a question', async () => {
        const { POST } = await importRoute();
        await drainStream(await POST(makeRequest()));
      });

      Then('exactly one AI call is made', () => {
        // Deploying the code ahead of the migration must not take Frank down.
        expect(mockAnthropicStream).toHaveBeenCalledTimes(1);
        expect(budgetReserved).toBe(0);
      });
    }
  );

  Scenario(
    'a free user is turned away while the free tier is off',
    ({ Given, When, Then, And }) => {
      let response: Response | null = null;

      Given('a signed-in free user with 0 queries this week', () => {
        profileTier = 'free';
        seedRows(0);
      });

      When('they ask Frank a question', async () => {
        const { POST } = await importRoute();
        response = await POST(makeRequest());
      });

      Then('the response status is 402', () => {
        expect(response?.status).toBe(402);
      });

      And('no AI call is made', () => {
        expect(mockAnthropicStream).not.toHaveBeenCalled();
      });
    }
  );

  Scenario('a free user gets an answer once the free tier is on', ({ Given, And, When, Then }) => {
    let sseText = '';

    Given('a signed-in free user with 0 queries this week', () => {
      profileTier = 'free';
      seedRows(0);
    });

    And('the free tier is switched on', () => {
      vi.stubEnv('FEATURE_FRANK_FREE_TIER', 'true');
    });

    When('they ask Frank a question', async () => {
      const { POST } = await importRoute();
      sseText = await drainStream(await POST(makeRequest()));
    });

    Then('exactly one AI call is made', () => {
      expect(mockAnthropicStream).toHaveBeenCalledTimes(1);
    });

    And('the reply reports the weekly free allowance', () => {
      const done = parseSseEvents(sseText).find((e) => e.event === 'done');
      const data = done?.data as { used: number; softCap: number; hardCap: number };
      expect(data.used).toBe(1);
      expect(data.hardCap).toBe(3);
      expect(data.softCap).toBe(2);
    });
  });

  Scenario(
    "a free user who has used the week's allowance is told what would lift it",
    ({ Given, And, When, Then }) => {
      let response: Response | null = null;
      let body: { error?: string; period?: string; upgradeTo?: string; limit?: number } = {};

      Given('a signed-in free user with 3 queries this week', () => {
        profileTier = 'free';
        seedRows(3);
      });

      And('the free tier is switched on', () => {
        vi.stubEnv('FEATURE_FRANK_FREE_TIER', 'true');
      });

      When('they ask Frank a question', async () => {
        const { POST } = await importRoute();
        response = await POST(makeRequest());
        body = (await response.json()) as typeof body;
      });

      Then('the response status is 429', () => {
        expect(response?.status).toBe(429);
      });

      And('no AI call is made', () => {
        expect(mockAnthropicStream).not.toHaveBeenCalled();
      });

      And('the reply names the weekly limit and the tier that lifts it', () => {
        expect(body.period).toBe('week');
        expect(body.limit).toBe(3);
        expect(body.upgradeTo).toBe('pro');
        expect(body.error).toBe('Weekly quota reached');
      });
    }
  );
});
