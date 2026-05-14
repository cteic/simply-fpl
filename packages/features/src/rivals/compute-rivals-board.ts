import { calculateLivePoints } from '@simplyfpl/fpl-client';
import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplLeagueStanding,
  FplLiveGameweek,
} from '@simplyfpl/types';

export interface RivalRow {
  entryId: number;
  entryName: string;
  playerName: string;
  livePoints: number;
  captainElement: number | null;
  captainMultiplier: number;
  activeChip: string | null;
  transferHits: number;
  benchPointsWasted: number;
}

export function computeRivalsBoard(
  _userEntryId: number,
  _leagueStandings: FplLeagueStanding[],
  rivalsData: Array<{
    entryId: number;
    entryName: string;
    playerName: string;
    picks: FplEntryGameweekPicks;
  }>,
  liveGw: FplLiveGameweek,
  bootstrap: FplBootstrapStatic
): RivalRow[] {
  const liveMap = new Map(liveGw.elements.map((e) => [e.id, e]));

  const rows = rivalsData.map((rival) => {
    const livePoints = calculateLivePoints(rival.picks, liveGw, bootstrap);

    const captainPick = rival.picks.picks.find((p) => p.is_captain) ?? null;
    const captainElement = captainPick?.element ?? null;
    const captainMultiplier = captainPick?.multiplier ?? 1;

    const benchPointsWasted = rival.picks.picks
      .filter((p) => p.position > 11 && p.multiplier === 0)
      .reduce((sum, p) => {
        const live = liveMap.get(p.element);
        return sum + (live?.stats.total_points ?? 0);
      }, 0);

    return {
      entryId: rival.entryId,
      entryName: rival.entryName,
      playerName: rival.playerName,
      livePoints,
      captainElement,
      captainMultiplier,
      activeChip: rival.picks.active_chip,
      transferHits: rival.picks.entry_history.event_transfers_cost,
      benchPointsWasted,
    };
  });

  rows.sort((a, b) => b.livePoints - a.livePoints);

  return rows;
}
