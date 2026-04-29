import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplLiveGameweek,
  LiveRankEntry,
} from '@simplyfpl/types';

/**
 * Calculate live points for a set of picks against live gameweek data.
 * Accounts for captain multiplier and active chip (TC, BB, FH).
 */
export function calculateLivePoints(
  picks: FplEntryGameweekPicks,
  liveData: FplLiveGameweek,
  bootstrap: FplBootstrapStatic
): number {
  const liveMap = new Map(liveData.elements.map(e => [e.id, e]));
  const isBlankweek = picks.active_chip === 'freehit';
  const isBenchBoost = picks.active_chip === 'bboost';
  const isTripleCaptain = picks.active_chip === '3xc';

  // Active players: positions 1-11 (or 1-15 on bench boost)
  const activePicks = isBenchBoost
    ? picks.picks
    : picks.picks.filter(p => p.position <= 11);

  let totalPoints = 0;

  for (const pick of activePicks) {
    const live = liveMap.get(pick.element);
    if (!live) continue;

    let points = live.stats.total_points;

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
  const withPoints = entries.map(entry => ({
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
  const current = bootstrap.events.find(e => e.is_current);
  return current?.id ?? null;
}

/**
 * Get next gameweek from bootstrap data.
 */
export function getNextGameweek(bootstrap: FplBootstrapStatic): number | null {
  const next = bootstrap.events.find(e => e.is_next);
  return next?.id ?? null;
}
