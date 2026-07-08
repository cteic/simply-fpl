import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

import type { TeamNewsGroup } from '@simplyfpl/types';

import {
  SUMMARY_SPEND_KEY,
  type TeamSummaryEnv,
  generateTeamSummaries,
  summaryKey,
  teamFingerprint,
} from './team-summary';

const feature = await loadFeature('./team-summary.feature');

interface KvPutOptions {
  expirationTtl?: number;
}

interface FakeKv {
  namespace: KVNamespace;
  store: Map<string, string>;
  ttls: Map<string, number | undefined>;
}

function makeKv(initial: Record<string, string> = {}): FakeKv {
  const store = new Map(Object.entries(initial));
  const ttls = new Map<string, number | undefined>();
  const namespace = {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string, options?: KvPutOptions) => {
      store.set(key, value);
      ttls.set(key, options?.expirationTtl);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
      ttls.delete(key);
    }),
  } as unknown as KVNamespace;
  return { namespace, store, ttls };
}

function makeGroup(playerCount: number, teamId = 1): TeamNewsGroup {
  const players = Array.from({ length: playerCount }, (_, i) => ({
    id: i + 1,
    web_name: `Player${i + 1}`,
    element_type: 3,
    team_id: teamId,
    chance_of_playing_next_round: 50,
    news: `Knock ${i + 1}`,
    status: 'doubt' as const,
  }));
  return {
    team_id: teamId,
    team_name: 'Arsenal',
    team_short_name: 'ARS',
    players,
  };
}

const SUMMARY_TTL = 48 * 60 * 60;
const DAILY_SPEND_CAP = 20;

const ORIGINAL_FETCH = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;

function makeAnthropicResponse(text: string): Response {
  return new Response(
    JSON.stringify({
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text }],
      model: 'claude-haiku-4-5-20251001',
      stop_reason: 'end_turn',
      usage: { input_tokens: 80, output_tokens: 60 },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  BeforeEachScenario(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  AfterEachScenario(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  Scenario(
    'Teams with fewer than 3 flagged players receive no summary',
    ({ Given, When, Then, And }) => {
      let group: TeamNewsGroup;
      let kv: FakeKv;

      Given('a team group with 2 flagged players', () => {
        group = makeGroup(2);
        kv = makeKv();
      });

      When('generateTeamSummaries is called', async () => {
        const env: TeamSummaryEnv = {
          FPL_CACHE: kv.namespace,
          ANTHROPIC_API_KEY: 'sk-test',
        };
        await generateTeamSummaries(env, [group]);
      });

      Then('the group summary is not set', () => {
        expect(group.summary).toBeUndefined();
      });

      And('the Anthropic API is not called', () => {
        expect(fetchMock).not.toHaveBeenCalled();
      });
    }
  );

  Scenario(
    'Teams with 3 or more flagged players receive a summary on cache miss',
    ({ Given, When, Then, And }) => {
      let group: TeamNewsGroup;
      let kv: FakeKv;
      const SUMMARY_TEXT = 'Arsenal face a tough week. Saka, Havertz and White are all doubtful.';

      Given('a team group with 3 flagged players', () => {
        group = makeGroup(3);
        kv = makeKv();
      });

      And(
        'the Anthropic API returns "Arsenal face a tough week. Saka, Havertz and White are all doubtful."',
        () => {
          fetchMock.mockResolvedValue(makeAnthropicResponse(SUMMARY_TEXT));
        }
      );

      When('generateTeamSummaries is called', async () => {
        const env: TeamSummaryEnv = {
          FPL_CACHE: kv.namespace,
          ANTHROPIC_API_KEY: 'sk-test',
        };
        await generateTeamSummaries(env, [group]);
      });

      Then('the group summary matches the Anthropic response', () => {
        expect(group.summary).toBe(SUMMARY_TEXT);
      });

      And('the summary is stored in KV with the 48-hour TTL', () => {
        const fp = teamFingerprint(group);
        const key = summaryKey(group.team_id, fp);
        expect(kv.store.get(key)).toBe(SUMMARY_TEXT);
        expect(kv.ttls.get(key)).toBe(SUMMARY_TTL);
      });
    }
  );

  Scenario(
    'Cached summary is served without a new Anthropic call',
    ({ Given, When, Then, And }) => {
      let group: TeamNewsGroup;
      let kv: FakeKv;
      const CACHED_TEXT = 'Three Arsenal players are doubts for the weekend.';

      Given('a team group with 3 flagged players', () => {
        group = makeGroup(3);
        const fp = teamFingerprint(group);
        const key = summaryKey(group.team_id, fp);
        kv = makeKv({ [key]: CACHED_TEXT });
      });

      And('a cached summary exists in KV for those players', () => {
        // set up in previous step
      });

      When('generateTeamSummaries is called', async () => {
        const env: TeamSummaryEnv = {
          FPL_CACHE: kv.namespace,
          ANTHROPIC_API_KEY: 'sk-test',
        };
        await generateTeamSummaries(env, [group]);
      });

      Then('the cached summary is returned', () => {
        expect(group.summary).toBe(CACHED_TEXT);
      });

      And('the Anthropic API is not called', () => {
        expect(fetchMock).not.toHaveBeenCalled();
      });
    }
  );

  Scenario(
    'Daily spend cap prevents further Anthropic calls when exhausted',
    ({ Given, When, Then, And }) => {
      let group: TeamNewsGroup;
      let kv: FakeKv;

      Given('a team group with 3 flagged players', () => {
        group = makeGroup(3);
        kv = makeKv({ [SUMMARY_SPEND_KEY]: String(DAILY_SPEND_CAP) });
      });

      And('the daily spend counter is already at the cap', () => {
        // set up in previous step
      });

      When('generateTeamSummaries is called', async () => {
        const env: TeamSummaryEnv = {
          FPL_CACHE: kv.namespace,
          ANTHROPIC_API_KEY: 'sk-test',
        };
        await generateTeamSummaries(env, [group]);
      });

      Then('no summary is generated', () => {
        expect(group.summary).toBeNull();
      });

      And('the Anthropic API is not called', () => {
        expect(fetchMock).not.toHaveBeenCalled();
      });
    }
  );

  Scenario(
    'A different set of flagged players produces a cache miss',
    ({ Given, When, Then, And }) => {
      let group: TeamNewsGroup;
      let kv: FakeKv;
      const NEW_SUMMARY = 'Four Arsenal players are now doubts. The squad is stretched thin.';

      Given('a team group with 3 flagged players cached under one fingerprint', () => {
        const original = makeGroup(3);
        const fp = teamFingerprint(original);
        const key = summaryKey(original.team_id, fp);
        kv = makeKv({ [key]: 'Old summary.' });
        group = makeGroup(4);
      });

      And('the team now has 4 flagged players (a new player added)', () => {
        // group already set to 4 players in previous step
      });

      And('the Anthropic API returns a new summary', () => {
        fetchMock.mockResolvedValue(makeAnthropicResponse(NEW_SUMMARY));
      });

      When('generateTeamSummaries is called', async () => {
        const env: TeamSummaryEnv = {
          FPL_CACHE: kv.namespace,
          ANTHROPIC_API_KEY: 'sk-test',
        };
        await generateTeamSummaries(env, [group]);
      });

      Then('the new summary is returned', () => {
        expect(group.summary).toBe(NEW_SUMMARY);
      });

      And('the Anthropic API is called once', () => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });
    }
  );
});
