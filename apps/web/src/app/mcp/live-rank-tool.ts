import {
  applyAutosubs,
  calculateLivePoints,
  estimateLiveRankSmart,
  getCurrentGameweek,
} from '@simplyfpl/fpl-client';
import type { FplEntrySnapshot, FplLiveGameweek } from '@simplyfpl/types';

import type { McpTool, ToolDefinition, ToolResult } from './protocol';

export const MIN_ENTRY_ID = 1;
export const MAX_ENTRY_ID = 20_000_000;
export const UPSTREAM_TIMEOUT_MS = 8000;

export const LIVE_RANK_TOOL_DEFINITION: ToolDefinition = {
  name: 'get_live_rank',
  title: 'Get live FPL rank',
  description:
    'Return the live overall rank estimate and live gameweek points for a Fantasy Premier League team, recalculated from in-progress fixtures. Takes the numeric FPL entry (team) id from the manager URL, e.g. 1234567 in fantasy.premierleague.com/entry/1234567/event/1.',
  inputSchema: {
    type: 'object',
    properties: {
      entryId: {
        type: 'integer',
        description: 'Numeric FPL entry (team) id.',
        minimum: MIN_ENTRY_ID,
        maximum: MAX_ENTRY_ID,
      },
    },
    required: ['entryId'],
    additionalProperties: false,
  },
};

export function parseEntryIdArgument(args: Record<string, unknown>): number | null {
  const raw = args['entryId'];
  const value = typeof raw === 'string' ? Number(raw) : raw;
  if (typeof value !== 'number') return null;
  if (!Number.isInteger(value)) return null;
  if (value < MIN_ENTRY_ID || value > MAX_ENTRY_ID) return null;
  return value;
}

function isFplEntrySnapshot(value: unknown): value is FplEntrySnapshot {
  if (typeof value !== 'object' || value === null) return false;
  if (!('gw' in value) || typeof value.gw !== 'number') return false;
  if (!('entry' in value) || typeof value.entry !== 'object' || value.entry === null) return false;
  if (!('bootstrap' in value) || typeof value.bootstrap !== 'object' || value.bootstrap === null) {
    return false;
  }
  if (!('picks' in value)) return false;
  return true;
}

function isFplLiveGameweek(value: unknown): value is FplLiveGameweek {
  return (
    typeof value === 'object' &&
    value !== null &&
    'elements' in value &&
    Array.isArray(value.elements)
  );
}

export type FetchJson = (url: string) => Promise<unknown>;

export function createTimeoutFetchJson(timeoutMs: number): FetchJson {
  return async function fetchJson(url: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!res.ok) throw new Error(`Upstream responded ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  };
}

export interface LiveRankToolOptions {
  apiBaseUrl: string;
  fetchJson: FetchJson;
}

export interface LiveRankPayload {
  entryId: number;
  teamName: string;
  managerName: string;
  gameweek: number;
  livePoints: number;
  livePointsAfterAutosubs: number;
  preGameweekOverallRank: number;
  liveOverallRank: number;
  rankMovement: number;
  direction: 'up' | 'down' | 'flat';
  estimateSource: string;
  gameweekAverageScore: number;
  source: string;
}

export async function computeLiveRank(
  entryId: number,
  { apiBaseUrl, fetchJson }: LiveRankToolOptions
): Promise<LiveRankPayload> {
  const snapshotBody = await fetchJson(`${apiBaseUrl}/snapshot/entry/${entryId}`);
  if (!isFplEntrySnapshot(snapshotBody)) {
    throw new Error(`No FPL team found for entry id ${entryId}`);
  }

  const { bootstrap, entry, picks } = snapshotBody;
  const gw = getCurrentGameweek(bootstrap) ?? snapshotBody.gw;
  if (picks === null) {
    throw new Error(`Picks are not available yet for entry ${entryId} in gameweek ${gw}`);
  }

  const liveBody = await fetchJson(`${apiBaseUrl}/fpl/event/${gw}/live/`);
  if (!isFplLiveGameweek(liveBody)) {
    throw new Error(`Live gameweek data unavailable for gameweek ${gw}`);
  }

  const livePoints = calculateLivePoints(picks, liveBody, bootstrap);
  const postSubsPicks = applyAutosubs(picks, liveBody, bootstrap);
  const postSubsPoints = calculateLivePoints(postSubsPicks, liveBody, bootstrap);
  const averageScore = bootstrap.events.find((event) => event.id === gw)?.average_entry_score ?? 0;
  const preGwRank = entry.summary_overall_rank;
  const estimate = estimateLiveRankSmart(gw, preGwRank, postSubsPoints, averageScore, {
    bootstrap,
  });

  return {
    entryId,
    teamName: entry.name,
    managerName: `${entry.player_first_name} ${entry.player_last_name}`.trim(),
    gameweek: gw,
    livePoints,
    livePointsAfterAutosubs: postSubsPoints,
    preGameweekOverallRank: preGwRank,
    liveOverallRank: estimate.liveRank,
    rankMovement: estimate.movement,
    direction: estimate.direction,
    estimateSource: estimate.source,
    gameweekAverageScore: averageScore,
    source: 'https://simplyfpl.com',
  };
}

export function createLiveRankTool(options: LiveRankToolOptions): McpTool {
  return {
    definition: LIVE_RANK_TOOL_DEFINITION,
    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const entryId = parseEntryIdArgument(args);
      if (entryId === null) {
        return {
          content: [
            {
              type: 'text',
              text: `entryId must be an integer between ${MIN_ENTRY_ID} and ${MAX_ENTRY_ID}.`,
            },
          ],
          isError: true,
        };
      }
      try {
        const payload = await computeLiveRank(entryId, options);
        return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown error';
        return { content: [{ type: 'text', text: detail }], isError: true };
      }
    },
  };
}
