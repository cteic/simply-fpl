import type {
  FplBootstrapStatic,
  FplElementType,
  FplEvent,
  FplPlayer,
  FplTeam,
} from '@simplyfpl/types';

function projectPlayer(p: FplPlayer): FplPlayer {
  return {
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
}

function projectTeam(t: FplTeam): FplTeam {
  return { id: t.id, name: t.name, short_name: t.short_name, code: t.code };
}

function projectEvent(e: FplEvent): FplEvent {
  return {
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
  return {
    elements: bootstrap.elements.map(projectPlayer),
    teams: bootstrap.teams.map(projectTeam),
    events: bootstrap.events.map(projectEvent),
    element_types: bootstrap.element_types.map(projectElementType),
  };
}
