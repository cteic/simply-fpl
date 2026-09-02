import type { FplLeague, FplLeagueStanding } from '@simplyfpl/types';

// Below this many members the banter beats (sack watch) read as bullying the
// one other person in the league, so they are suppressed.
const MIN_MEMBERS_FOR_SACK_WATCH = 3;
const DEFAULT_RIVALRY_GAP = 5;

export interface PressTeamRef {
  entryId: number;
  entryName: string;
  playerName: string;
}

export interface LeaguePressStanding {
  rank: number;
  entryName: string;
  total: number;
  eventTotal: number;
}

export interface LeaguePress {
  leagueName: string;
  memberCount: number;
  leader: PressTeamRef & { total: number; eventTotal: number };
  chaser: (PressTeamRef & { gap: number }) | null;
  isRivalryWeek: boolean;
  topScore: PressTeamRef & { eventTotal: number };
  sackWatch: (PressTeamRef & { eventTotal: number }) | null;
  biggestClimb: (PressTeamRef & { places: number }) | null;
  standingsTop: LeaguePressStanding[];
  yourRank: number | null;
}

export interface BuildLeaguePressOptions {
  rivalryGap?: number;
}

function ref(s: FplLeagueStanding): PressTeamRef {
  return { entryId: s.entry, entryName: s.entry_name, playerName: s.player_name };
}

/**
 * Derives the weekly mini-league "gazette" beats from a league's standings
 * page. Tone-neutral structured data — headline copy is a presentation
 * concern. Returns null when the league has no standings yet.
 */
export function buildLeaguePress(
  league: FplLeague,
  entryId: number | null,
  options: BuildLeaguePressOptions = {}
): LeaguePress | null {
  const rivalryGap = options.rivalryGap ?? DEFAULT_RIVALRY_GAP;
  const results = league.standings.results;
  if (results.length === 0) return null;

  const byRank = [...results].sort((a, b) => a.rank - b.rank);
  const leader = byRank[0];
  if (leader === undefined) return null;
  const runnerUp = byRank[1] ?? null;

  const topScore = results.reduce((best, s) => (s.event_total > best.event_total ? s : best));

  const sackWatch =
    results.length >= MIN_MEMBERS_FOR_SACK_WATCH
      ? results.reduce((worst, s) => (s.event_total < worst.event_total ? s : worst))
      : null;

  let climber: FplLeagueStanding | null = null;
  let climberPlaces = 0;
  for (const s of results) {
    const places = s.last_rank - s.rank;
    if (s.last_rank > 0 && places > climberPlaces) {
      climber = s;
      climberPlaces = places;
    }
  }

  const yours = entryId === null ? null : (results.find((s) => s.entry === entryId) ?? null);
  const gap = runnerUp === null ? null : leader.total - runnerUp.total;

  return {
    leagueName: league.league.name,
    memberCount: results.length,
    leader: { ...ref(leader), total: leader.total, eventTotal: leader.event_total },
    chaser: runnerUp === null || gap === null ? null : { ...ref(runnerUp), gap },
    isRivalryWeek: gap !== null && gap <= rivalryGap,
    topScore: { ...ref(topScore), eventTotal: topScore.event_total },
    sackWatch: sackWatch === null ? null : { ...ref(sackWatch), eventTotal: sackWatch.event_total },
    biggestClimb: climber === null ? null : { ...ref(climber), places: climberPlaces },
    standingsTop: byRank.slice(0, 3).map((s) => ({
      rank: s.rank,
      entryName: s.entry_name,
      total: s.total,
      eventTotal: s.event_total,
    })),
    yourRank: yours?.rank ?? null,
  };
}
