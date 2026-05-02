// FPL Bootstrap / Player types
export interface FplPlayer {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  team: number;
  element_type: number; // 1=GKP, 2=DEF, 3=MID, 4=FWD
  now_cost: number; // in tenths (e.g. 55 = £5.5m)
  total_points: number;
  event_points: number;
  selected_by_percent: string;
  transfers_in_event: number;
  transfers_out_event: number;
  chance_of_playing_next_round: number | null;
  news: string;
}

export interface FplTeam {
  id: number;
  name: string;
  short_name: string;
  code: number;
}

export interface FplBootstrapStatic {
  elements: FplPlayer[];
  teams: FplTeam[];
  events: FplEvent[];
  element_types: FplElementType[];
}

export interface FplEvent {
  id: number;
  name: string;
  deadline_time: string;
  is_current: boolean;
  is_next: boolean;
  is_previous: boolean;
  average_entry_score: number;
  highest_score: number | null;
  finished: boolean;
}

export interface FplElementType {
  id: number;
  plural_name: string;
  plural_name_short: string;
  singular_name: string;
  singular_name_short: string;
}

// Live gameweek types
export interface FplLiveElement {
  id: number;
  stats: {
    minutes: number;
    goals_scored: number;
    assists: number;
    clean_sheets: number;
    goals_conceded: number;
    yellow_cards: number;
    red_cards: number;
    saves: number;
    bonus: number;
    bps: number;
    total_points: number;
  };
  explain: FplExplain[];
}

export interface FplExplain {
  fixture: number;
  stats: Array<{
    identifier: string;
    points: number;
    value: number;
  }>;
}

export interface FplLiveGameweek {
  elements: FplLiveElement[];
}

// Entry (manager) types
export interface FplEntry {
  id: number;
  player_first_name: string;
  player_last_name: string;
  name: string; // team name
  summary_overall_rank: number;
  summary_overall_points: number;
  summary_event_rank: number | null;
  summary_event_points: number;
}

export interface FplEntryPick {
  element: number;
  position: number;
  multiplier: number; // 1, 2 (captain), 3 (triple captain)
  is_captain: boolean;
  is_vice_captain: boolean;
}

export interface FplEntryGameweekPicks {
  active_chip: string | null;
  automatic_subs: unknown[];
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    rank: number;
    rank_sort: number;
    overall_rank: number;
    event_transfers: number;
    event_transfers_cost: number;
    points_on_bench: number;
  };
  picks: FplEntryPick[];
}

// League types
export interface FplLeagueStanding {
  id: number;
  entry: number;
  entry_name: string;
  player_name: string;
  rank: number;
  last_rank: number;
  rank_sort: number;
  total: number;
  event_total: number;
}

export interface FplLeague {
  league: {
    id: number;
    name: string;
    created: string;
    admin_entry: number | null;
    start_event: number;
    league_type: 'x' | 'c' | 's'; // classic, head-to-head, etc.
  };
  standings: {
    has_next: boolean;
    page: number;
    results: FplLeagueStanding[];
  };
}

// Fixtures
export type FplDifficulty = 1 | 2 | 3 | 4 | 5;

export interface FplFixture {
  code: number;
  event: number | null; // gameweek number; null for postponed/unscheduled
  finished: boolean;
  finished_provisional: boolean;
  id: number;
  kickoff_time: string | null;
  minutes: number;
  provisional_start_time: boolean;
  started: boolean | null;
  team_a: number; // away team id
  team_a_score: number | null;
  team_h: number; // home team id
  team_h_score: number | null;
  team_h_difficulty: FplDifficulty;
  team_a_difficulty: FplDifficulty;
}

// Computed/app types
export interface LiveRankEntry {
  entryId: number;
  entryName: string;
  playerName: string;
  livePoints: number;
  liveRank: number | null;
  previousRank: number;
  rankMovement: number;
  picks: FplEntryPick[];
}

export interface PriceChange {
  player: FplPlayer;
  team: FplTeam;
  netTransfers: number;
  direction: 'rise' | 'fall' | 'none';
  probability: number; // 0-1
}

export * from './db';
