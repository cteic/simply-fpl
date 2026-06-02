import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { ArchiveBootstrap, ArchiveEntry, ArchiveGwHistory } from './replay-archive';

export interface LoadArchiveOptions {
  season?: string;
  leagueId?: number;
}

const DEFAULT_SEASON = '2025-26';
const DEFAULT_LEAGUE_ID = 936326;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Load `events[].average_entry_score` and `total_players` from the archived
 * bootstrap-static.json. Reads raw JSON and narrows with runtime guards so the
 * loader does not depend on the full domain type surface.
 */
export function loadBootstrap(archiveRoot: string, season: string): ArchiveBootstrap {
  const raw = readJson(join(archiveRoot, season, 'bootstrap-static.json'));
  if (!isRecord(raw)) {
    throw new Error('bootstrap-static.json is not an object');
  }
  const { total_players: totalPlayers, events } = raw;
  if (typeof totalPlayers !== 'number') {
    throw new Error('bootstrap-static.json missing numeric total_players');
  }
  if (!Array.isArray(events)) {
    throw new Error('bootstrap-static.json missing events array');
  }

  const averageEntryScoreByEvent = new Map<number, number>();
  for (const event of events) {
    if (!isRecord(event)) continue;
    const { id, average_entry_score: avg } = event;
    if (typeof id === 'number' && typeof avg === 'number') {
      averageEntryScoreByEvent.set(id, avg);
    }
  }

  return { totalPlayers, averageEntryScoreByEvent };
}

function parseHistoryRow(raw: unknown): ArchiveGwHistory | undefined {
  if (!isRecord(raw)) return undefined;
  const { event, points, overall_rank: overallRank, event_transfers_cost: cost } = raw;
  if (typeof event !== 'number') return undefined;
  if (typeof points !== 'number') return undefined;
  if (typeof overallRank !== 'number') return undefined;
  const transfersCost = typeof cost === 'number' ? cost : 0;
  return {
    event,
    points,
    overall_rank: overallRank,
    event_transfers_cost: transfersCost,
  };
}

/**
 * Load every archived manager's `history.json` for the league, parsing only the
 * `current[]` ground-truth rows the harness needs (`overall_rank`, `points`,
 * `event_transfers_cost`).
 */
export function loadEntries(archiveRoot: string, season: string, leagueId: number): ArchiveEntry[] {
  const entryRoot = join(archiveRoot, season, `league-${leagueId}`, 'entry');
  const entryIds = readdirSync(entryRoot, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  const entries: ArchiveEntry[] = [];
  for (const idName of entryIds) {
    const entryId = Number(idName);
    if (!Number.isFinite(entryId)) continue;
    const raw = readJson(join(entryRoot, idName, 'history.json'));
    if (!isRecord(raw) || !Array.isArray(raw.current)) continue;

    const current: ArchiveGwHistory[] = [];
    for (const row of raw.current) {
      const parsed = parseHistoryRow(row);
      if (parsed) current.push(parsed);
    }
    if (current.length > 0) {
      entries.push({ entryId, current });
    }
  }

  entries.sort((a, b) => a.entryId - b.entryId);
  return entries;
}

export interface LoadedArchive {
  season: string;
  leagueId: number;
  bootstrap: ArchiveBootstrap;
  entries: ArchiveEntry[];
}

/**
 * Resolve and load the committed season archive under
 * `<archiveRoot>/<season>/`. Pure disk IO, no network — replays committed
 * fixtures only.
 */
export function loadArchive(archiveRoot: string, options: LoadArchiveOptions = {}): LoadedArchive {
  const season = options.season ?? DEFAULT_SEASON;
  const leagueId = options.leagueId ?? DEFAULT_LEAGUE_ID;
  return {
    season,
    leagueId,
    bootstrap: loadBootstrap(archiveRoot, season),
    entries: loadEntries(archiveRoot, season, leagueId),
  };
}
