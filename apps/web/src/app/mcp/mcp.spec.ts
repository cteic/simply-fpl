import { describe, expect, it } from 'vitest';

import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplEntrySnapshot,
  FplLiveGameweek,
} from '@simplyfpl/types';

import {
  LIVE_RANK_TOOL_DEFINITION,
  computeLiveRank,
  createLiveRankTool,
  parseEntryIdArgument,
} from './live-rank-tool';
import { JSON_RPC_ERROR_CODES, MCP_PROTOCOL_VERSION, handleJsonRpc } from './protocol';

const API_BASE_URL = 'https://api.test';

function buildBootstrap(): FplBootstrapStatic {
  return {
    elements: [],
    teams: [],
    element_types: [],
    events: [
      {
        id: 3,
        name: 'Gameweek 3',
        deadline_time: '2026-08-28T17:30:00Z',
        is_current: true,
        is_next: false,
        is_previous: false,
        average_entry_score: 50,
        highest_score: 120,
        finished: false,
      },
    ],
  };
}

function buildPicks(): FplEntryGameweekPicks {
  return {
    active_chip: null,
    automatic_subs: [],
    entry_history: {
      event: 3,
      points: 0,
      total_points: 0,
      rank: 0,
      rank_sort: 0,
      overall_rank: 100_000,
      event_transfers: 0,
      event_transfers_cost: 0,
      points_on_bench: 0,
    },
    picks: [
      { element: 1, position: 1, multiplier: 1, is_captain: false, is_vice_captain: false },
      { element: 2, position: 2, multiplier: 2, is_captain: true, is_vice_captain: false },
    ],
  };
}

function buildSnapshot(): FplEntrySnapshot {
  return {
    bootstrap: buildBootstrap(),
    entry: {
      id: 1234567,
      player_first_name: 'Ada',
      player_last_name: 'Lovelace',
      name: 'Analytical Engine FC',
      summary_overall_rank: 100_000,
      summary_overall_points: 140,
      summary_event_rank: 900,
      summary_event_points: 62,
    },
    picks: buildPicks(),
    gw: 3,
    picksAvailable: true,
  };
}

function buildStats(totalPoints: number, bps: number) {
  return {
    minutes: 90,
    goals_scored: 0,
    assists: 0,
    clean_sheets: 0,
    goals_conceded: 0,
    yellow_cards: 0,
    red_cards: 0,
    saves: 0,
    bonus: 0,
    bps,
    total_points: totalPoints,
    clearances_blocks_interceptions: 0,
    tackles: 0,
  };
}

function buildLive(): FplLiveGameweek {
  return {
    elements: [
      { id: 1, stats: buildStats(6, 20), explain: [] },
      { id: 2, stats: buildStats(10, 40), explain: [] },
    ],
  };
}

function stubFetchJson(overrides: Record<string, unknown> = {}) {
  const calls: string[] = [];
  async function fetchJson(url: string): Promise<unknown> {
    calls.push(url);
    if (url in overrides) return overrides[url];
    if (url.includes('/snapshot/entry/')) return buildSnapshot();
    if (url.includes('/live/')) return buildLive();
    throw new Error(`Unexpected fetch: ${url}`);
  }
  return { fetchJson, calls };
}

function tools() {
  const { fetchJson } = stubFetchJson();
  return [createLiveRankTool({ apiBaseUrl: API_BASE_URL, fetchJson })];
}

const SERVER = { serverName: 'SimplyFPL MCP server', serverVersion: '1.0.0' };

describe('initialize', () => {
  it('negotiates the protocol version and advertises tool support', async () => {
    const response = await handleJsonRpc(
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
      { ...SERVER, tools: tools() }
    );
    expect(response).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
      },
    });
  });
});

describe('tools/list', () => {
  it('returns the get_live_rank tool with a JSON-Schema input', async () => {
    const response = await handleJsonRpc(
      { jsonrpc: '2.0', id: 2, method: 'tools/list' },
      { ...SERVER, tools: tools() }
    );
    expect(response).not.toBeNull();
    const result = response && 'result' in response ? response.result : null;
    expect(result).not.toBeNull();
    const listed = result?.['tools'];
    expect(listed).toEqual([LIVE_RANK_TOOL_DEFINITION]);
    expect(LIVE_RANK_TOOL_DEFINITION.inputSchema.required).toEqual(['entryId']);
    expect(LIVE_RANK_TOOL_DEFINITION.inputSchema.additionalProperties).toBe(false);
  });
});

describe('tools/call', () => {
  it('returns a live rank payload for a valid entry id', async () => {
    const response = await handleJsonRpc(
      {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'get_live_rank', arguments: { entryId: 1234567 } },
      },
      { ...SERVER, tools: tools() }
    );
    expect(response).not.toBeNull();
    const result = response && 'result' in response ? response.result : null;
    expect(result?.['isError']).toBe(false);
    const content = result?.['content'];
    expect(Array.isArray(content)).toBe(true);
    const text = JSON.stringify(content);
    expect(text).toContain('Analytical Engine FC');
    expect(text).toContain('liveOverallRank');
  });

  it('rejects an out-of-range entry id as a tool error, not a protocol error', async () => {
    const response = await handleJsonRpc(
      {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'get_live_rank', arguments: { entryId: -1 } },
      },
      { ...SERVER, tools: tools() }
    );
    const result = response && 'result' in response ? response.result : null;
    expect(result?.['isError']).toBe(true);
  });

  it('rejects an unknown tool name with an invalid-params error', async () => {
    const response = await handleJsonRpc(
      {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: { name: 'drop_database', arguments: {} },
      },
      { ...SERVER, tools: tools() }
    );
    expect(response).toMatchObject({
      jsonrpc: '2.0',
      id: 5,
      error: { code: JSON_RPC_ERROR_CODES.invalidParams },
    });
  });

  it('rejects a missing tool name', async () => {
    const response = await handleJsonRpc(
      { jsonrpc: '2.0', id: 6, method: 'tools/call', params: {} },
      { ...SERVER, tools: tools() }
    );
    expect(response).toMatchObject({ error: { code: JSON_RPC_ERROR_CODES.invalidParams } });
  });
});

describe('JSON-RPC envelope handling', () => {
  it('returns method-not-found for an unknown method', async () => {
    const response = await handleJsonRpc(
      { jsonrpc: '2.0', id: 7, method: 'resources/list' },
      { ...SERVER, tools: tools() }
    );
    expect(response).toEqual({
      jsonrpc: '2.0',
      id: 7,
      error: {
        code: JSON_RPC_ERROR_CODES.methodNotFound,
        message: 'Method not found: resources/list',
      },
    });
  });

  it('rejects a malformed envelope', async () => {
    for (const bad of [null, 'hello', { method: 'tools/list' }, { jsonrpc: '1.0', method: 'x' }]) {
      const response = await handleJsonRpc(bad, { ...SERVER, tools: tools() });
      expect(response).toMatchObject({ error: { code: JSON_RPC_ERROR_CODES.invalidRequest } });
    }
  });

  it('does not answer notifications', async () => {
    expect(
      await handleJsonRpc(
        { jsonrpc: '2.0', method: 'notifications/initialized' },
        { ...SERVER, tools: tools() }
      )
    ).toBeNull();
  });
});

describe('parseEntryIdArgument', () => {
  it('accepts integers and numeric strings inside the allowed range', () => {
    expect(parseEntryIdArgument({ entryId: 1234567 })).toBe(1234567);
    expect(parseEntryIdArgument({ entryId: '1234567' })).toBe(1234567);
  });

  it('rejects anything else', () => {
    for (const bad of [undefined, null, 0, -1, 1.5, 'abc', 20_000_001, {}, []]) {
      expect(parseEntryIdArgument({ entryId: bad })).toBeNull();
    }
  });
});

describe('computeLiveRank', () => {
  it('applies the captain multiplier and estimates a rank movement', async () => {
    // 6 + (10 x 2 captain) = 26, below the gameweek average of 50, so rank falls.
    const { fetchJson, calls } = stubFetchJson();
    const payload = await computeLiveRank(1234567, { apiBaseUrl: API_BASE_URL, fetchJson });
    expect(payload.livePoints).toBe(26);
    expect(payload.gameweek).toBe(3);
    expect(payload.preGameweekOverallRank).toBe(100_000);
    expect(payload.liveOverallRank).toBeGreaterThanOrEqual(1);
    expect(payload.direction).toBe('down');
    expect(payload.liveOverallRank).toBeGreaterThan(payload.preGameweekOverallRank);
    expect(calls[0]).toBe(`${API_BASE_URL}/snapshot/entry/1234567`);
    expect(calls[1]).toBe(`${API_BASE_URL}/fpl/event/3/live/`);
  });

  it('fails loudly when the upstream payload is not a snapshot', async () => {
    const { fetchJson } = stubFetchJson({
      [`${API_BASE_URL}/snapshot/entry/999`]: { error: 'nope' },
    });
    await expect(computeLiveRank(999, { apiBaseUrl: API_BASE_URL, fetchJson })).rejects.toThrow(
      /No FPL team found/
    );
  });
});
