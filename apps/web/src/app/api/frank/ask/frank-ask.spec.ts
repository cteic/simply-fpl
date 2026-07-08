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
              Promise.resolve({ data: { tier: 'ultimate', fpl_entry_id: null }, error: null }),
          }),
        }),
      }),
    }),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdminClient: () => ({
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
});
