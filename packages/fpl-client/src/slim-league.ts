import type { FplLeague, FplLeagueStanding } from '@simplyfpl/types';

function projectStanding(s: FplLeagueStanding): FplLeagueStanding {
  return {
    id: s.id,
    entry: s.entry,
    entry_name: s.entry_name,
    player_name: s.player_name,
    rank: s.rank,
    last_rank: s.last_rank,
    rank_sort: s.rank_sort,
    total: s.total,
    event_total: s.event_total,
  };
}

export function buildSlimLeague(league: FplLeague): FplLeague {
  return {
    league: {
      id: league.league.id,
      name: league.league.name,
      created: league.league.created,
      admin_entry: league.league.admin_entry,
      start_event: league.league.start_event,
      league_type: league.league.league_type,
    },
    standings: {
      has_next: league.standings.has_next,
      page: league.standings.page,
      results: league.standings.results.map(projectStanding),
    },
  };
}
