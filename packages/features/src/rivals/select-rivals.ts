import type { FplLeagueStanding } from '@simplyfpl/types';

export const SMALL_LEAGUE_THRESHOLD = 19;
export const DEFAULT_WINDOW_ABOVE = 2;
export const DEFAULT_WINDOW_BELOW = 2;

export interface SelectRivalsOptions {
  above?: number;
  below?: number;
}

export interface SelectRivalsResult {
  rivalEntryIds: number[];
  userStanding: FplLeagueStanding | null;
  isWholeLeague: boolean;
}

export function selectRivalEntryIds(
  standings: FplLeagueStanding[],
  userEntryId: number,
  options: SelectRivalsOptions = {}
): SelectRivalsResult {
  if (standings.length === 0) {
    return { rivalEntryIds: [], userStanding: null, isWholeLeague: false };
  }

  if (standings.length <= SMALL_LEAGUE_THRESHOLD) {
    const userStanding = standings.find((s) => s.entry === userEntryId) ?? null;
    return {
      rivalEntryIds: standings.filter((s) => s.entry !== userEntryId).map((s) => s.entry),
      userStanding,
      isWholeLeague: true,
    };
  }

  const sorted = [...standings].sort((a, b) => a.rank - b.rank);
  const userIdx = sorted.findIndex((s) => s.entry === userEntryId);
  if (userIdx === -1) {
    return { rivalEntryIds: [], userStanding: null, isWholeLeague: false };
  }

  const above = options.above ?? DEFAULT_WINDOW_ABOVE;
  const below = options.below ?? DEFAULT_WINDOW_BELOW;
  const start = Math.max(0, userIdx - above);
  const end = Math.min(sorted.length, userIdx + below + 1);
  const window = sorted.slice(start, end);
  const userStanding = sorted[userIdx] ?? null;

  return {
    rivalEntryIds: window.filter((s) => s.entry !== userEntryId).map((s) => s.entry),
    userStanding,
    isWholeLeague: false,
  };
}
