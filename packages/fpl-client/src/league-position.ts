import type {
  FplBootstrapStatic,
  FplLeagueStanding,
  GameweekPhase,
  LeaguePosition,
} from '@simplyfpl/types';

/**
 * Where the season is relative to the current gameweek.
 *
 * `is_current` alone cannot answer this. An event keeps that flag until the
 * next deadline, so it is set on a gameweek in progress and on one that
 * finished days ago alike. Anything labelled "live" should ask this instead.
 */
export function getGameweekPhase(
  bootstrap: FplBootstrapStatic,
  nowMs: number = Date.now()
): GameweekPhase {
  const current = bootstrap.events.find((e) => e.is_current);
  if (!current) return 'pre';
  if (current.finished) return 'settled';
  const deadline = Date.parse(current.deadline_time);
  if (Number.isFinite(deadline) && nowMs < deadline) return 'pre';
  return 'live';
}

/**
 * A manager's standing in one mini-league, in the terms a rival would use:
 * who is directly above and below, by how much, and how this gameweek went
 * against the rest of the league.
 *
 * Works from one page of standings. When the manager is not on it, returns
 * null rather than guessing at rows it cannot see. Pass `complete: false` when
 * the league has further pages: the league size and the gameweek place then
 * come back null, because both depend on managers this page does not hold.
 */
export function describeLeaguePosition(
  standings: FplLeagueStanding[],
  myEntryId: number,
  options: { complete?: boolean } = {}
): LeaguePosition | null {
  const complete = options.complete ?? true;
  const ordered = standings.slice().sort((a, b) => a.rank_sort - b.rank_sort);
  const index = ordered.findIndex((row) => row.entry === myEntryId);
  if (index < 0) return null;
  const me = ordered[index];
  if (!me) return null;

  const above = index > 0 ? ordered[index - 1] : undefined;
  const below = index < ordered.length - 1 ? ordered[index + 1] : undefined;
  const leader = ordered[0];

  // Rank within the league on this gameweek's score alone. Ties share the
  // better place, as a league table would show them.
  const gameweekPlace = 1 + ordered.filter((row) => row.event_total > me.event_total).length;

  return {
    rank: me.rank,
    managers: complete ? ordered.length : null,
    movement: me.last_rank > 0 ? me.last_rank - me.rank : 0,
    above: above ? { name: above.player_name, gap: above.total - me.total } : null,
    below: below ? { name: below.player_name, gap: me.total - below.total } : null,
    gapToLeader: leader && leader.entry !== me.entry ? leader.total - me.total : 0,
    gameweekPlace: complete ? gameweekPlace : null,
  };
}

/**
 * The first gameweek a manager can still make decisions for.
 *
 * That is the upcoming one. The current gameweek is either in progress, with
 * its deadline gone, or finished, and a planner that opens on it spends its
 * first column on fixtures nobody can act on. Falls back to the current
 * gameweek only when there is no next one, at the end of the season.
 */
export function getPlanningGameweek(bootstrap: FplBootstrapStatic): number | null {
  const next = bootstrap.events.find((e) => e.is_next);
  if (next) return next.id;
  return bootstrap.events.find((e) => e.is_current)?.id ?? null;
}
