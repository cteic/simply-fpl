import type {
  FplBootstrapStatic,
  FplElementType,
  FplEvent,
  FplPlayer,
  FplTeam,
} from '@simplyfpl/types';

/**
 * Threshold progress below which a player's price fields are left out of the
 * slim payload. Half the scout inbox's own reporting threshold, so nothing the
 * inbox would show is lost.
 */
export const SLIM_PRICE_PROGRESS_FLOOR = 25;

function projectPlayer(p: FplPlayer): FplPlayer {
  const slim: FplPlayer = {
    id: p.id,
    web_name: p.web_name,
    first_name: '',
    second_name: '',
    team: p.team,
    element_type: p.element_type,
    now_cost: p.now_cost,
    total_points: 0,
    event_points: p.event_points,
    selected_by_percent: p.selected_by_percent,
    transfers_in_event: 0,
    transfers_out_event: 0,
    chance_of_playing_next_round: p.chance_of_playing_next_round,
    news: '',
  };
  // Price fields ride along only for players meaningfully close to a change,
  // and only with today's projection. Carrying all five fields and the
  // three-day projection for every player doubled this payload, 13 KB to 28 KB
  // gzipped, for the benefit of rows no screen shows. The full detail is served
  // by /fpl/prices, which reads the unslimmed bootstrap.
  const progress = Math.abs(Number.parseFloat(p.price_change_percent ?? ''));
  if (Number.isFinite(progress) && progress >= SLIM_PRICE_PROGRESS_FLOOR) {
    if (p.price_change_percent !== undefined) slim.price_change_percent = p.price_change_percent;
    const today = p.price_change_projections?.find((projection) => projection.offset === 0);
    if (today) slim.price_change_projections = [today];
    if (typeof p.price_change_locked_until === 'string') {
      slim.price_change_locked_until = p.price_change_locked_until;
    }
  }
  // Only a couple of dozen players carry risks, so the empty arrays on the
  // other six hundred are not worth shipping.
  if (Array.isArray(p.scout_risks) && p.scout_risks.length > 0) slim.scout_risks = p.scout_risks;
  return slim;
}

function projectTeam(t: FplTeam): FplTeam {
  return { id: t.id, name: t.name, short_name: t.short_name, code: t.code };
}

function projectEvent(e: FplEvent): FplEvent {
  const slim: FplEvent = {
    id: e.id,
    name: e.name,
    deadline_time: e.deadline_time,
    is_current: e.is_current,
    is_next: e.is_next,
    is_previous: e.is_previous,
    average_entry_score: e.average_entry_score,
    highest_score: e.highest_score,
    finished: e.finished,
  };
  if (e.data_checked !== undefined) slim.data_checked = e.data_checked;
  if (e.ranked_count !== undefined) slim.ranked_count = e.ranked_count;
  return slim;
}

function projectElementType(et: FplElementType): FplElementType {
  return {
    id: et.id,
    plural_name: et.plural_name,
    plural_name_short: et.plural_name_short,
    singular_name: et.singular_name,
    singular_name_short: et.singular_name_short,
  };
}

export function buildSlimBootstrap(bootstrap: FplBootstrapStatic): FplBootstrapStatic {
  const slim: FplBootstrapStatic = {
    elements: bootstrap.elements.map(projectPlayer),
    teams: bootstrap.teams.map(projectTeam),
    events: bootstrap.events.map(projectEvent),
    element_types: bootstrap.element_types.map(projectElementType),
  };
  if (bootstrap.total_players !== undefined) slim.total_players = bootstrap.total_players;
  return slim;
}
