import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplLiveGameweek,
  LiveRankEntry,
} from '@simplyfpl/types';

import type { BonusPrediction } from './bonus-points';

/**
 * Calculate live points for a set of picks against live gameweek data.
 * Accounts for captain multiplier and active chip (TC, BB, FH).
 * Optionally folds in predicted bonus from `predictBonusPoints` — provisional
 * bonus is added on top of `total_points`; non-provisional bonus is assumed to
 * already be reflected in FPL's `total_points`.
 */
export function calculateLivePoints(
  picks: FplEntryGameweekPicks,
  liveData: FplLiveGameweek,
  _bootstrap: FplBootstrapStatic,
  bonusMap?: Map<number, BonusPrediction>
): number {
  const liveMap = new Map(liveData.elements.map((e) => [e.id, e]));
  const isBenchBoost = picks.active_chip === 'bboost';
  const isTripleCaptain = picks.active_chip === '3xc';

  // Active players: positions 1-11 (or 1-15 on bench boost)
  const activePicks = isBenchBoost ? picks.picks : picks.picks.filter((p) => p.position <= 11);

  let totalPoints = 0;

  for (const pick of activePicks) {
    const live = liveMap.get(pick.element);
    if (!live) continue;

    let points = live.stats.total_points;
    const bonusInfo = bonusMap?.get(pick.element);
    if (bonusInfo && bonusInfo.provisional) {
      points += bonusInfo.bonus;
    }

    // Apply multiplier (captain = 2x, TC chip = 3x)
    if (pick.is_captain) {
      const multiplier = isTripleCaptain ? 3 : 2;
      points = points * multiplier;
    }

    totalPoints += points;
  }

  // Deduct transfer hit
  totalPoints -= picks.entry_history.event_transfers_cost;

  return totalPoints;
}

/**
 * Build live rank entries for a mini-league.
 * Pass an array of [entry history + picks] tuples alongside live data.
 */
export function buildLiveLeagueTable(
  entries: Array<{
    entryId: number;
    entryName: string;
    playerName: string;
    previousRank: number;
    picks: FplEntryGameweekPicks;
  }>,
  liveData: FplLiveGameweek,
  bootstrap: FplBootstrapStatic
): LiveRankEntry[] {
  const withPoints = entries.map((entry) => ({
    entryId: entry.entryId,
    entryName: entry.entryName,
    playerName: entry.playerName,
    livePoints: calculateLivePoints(entry.picks, liveData, bootstrap),
    previousRank: entry.previousRank,
    picks: entry.picks.picks,
  }));

  // Sort by live points descending
  withPoints.sort((a, b) => b.livePoints - a.livePoints);

  return withPoints.map((entry, index) => ({
    ...entry,
    liveRank: index + 1,
    rankMovement: entry.previousRank - (index + 1),
  }));
}

/**
 * Get current gameweek from bootstrap data.
 */
export function getCurrentGameweek(bootstrap: FplBootstrapStatic): number | null {
  const current = bootstrap.events.find((e) => e.is_current);
  return current?.id ?? null;
}

/**
 * Get next gameweek from bootstrap data.
 */
export function getNextGameweek(bootstrap: FplBootstrapStatic): number | null {
  const next = bootstrap.events.find((e) => e.is_next);
  return next?.id ?? null;
}

export interface NextDeadline {
  event: number;
  deadlineTime: string;
}

/**
 * The upcoming gameweek deadline (the `is_next` event's `deadline_time`).
 * Returns null at the end of the season when there is no next event.
 */
export function getNextDeadline(bootstrap: FplBootstrapStatic): NextDeadline | null {
  const next = bootstrap.events.find((e) => e.is_next);
  if (!next) return null;
  return { event: next.id, deadlineTime: next.deadline_time };
}

/**
 * Human-readable time-until-deadline, coarsened to the two most significant
 * units (e.g. "2d 4h", "4h 32m", "12m 30s", "45s"). Returns "closed" once the
 * deadline has passed.
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'closed';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export interface LiveRankEstimate {
  liveRank: number;
  movement: number;
  direction: 'up' | 'down' | 'flat';
}

const PLACES_PER_POINT = 700;

export function estimateLiveRank(
  preGwRank: number,
  livePoints: number,
  avgEntryScore: number
): LiveRankEstimate {
  const delta = livePoints - avgEntryScore;
  const movement = Math.round(delta * PLACES_PER_POINT);
  const liveRank = Math.max(1, preGwRank - movement);
  let direction: LiveRankEstimate['direction'] = 'flat';
  if (movement > 0) direction = 'up';
  else if (movement < 0) direction = 'down';
  return { liveRank, movement, direction };
}

export interface RankDetails {
  oldRank: number;
  preSubsRank: number;
  postSubsRank: number;
  changePct: number;
}

export function computeRankDetails(
  preGwRank: number,
  livePoints: number,
  postSubsPoints: number,
  avgEntryScore: number
): RankDetails | null {
  if (preGwRank <= 0) return null;
  const preSubs = estimateLiveRank(preGwRank, livePoints, avgEntryScore);
  const postSubs = estimateLiveRank(preGwRank, postSubsPoints, avgEntryScore);
  return {
    oldRank: preGwRank,
    preSubsRank: preSubs.liveRank,
    postSubsRank: postSubs.liveRank,
    changePct: (postSubs.movement / preGwRank) * 100,
  };
}
