import type {
  FplBootstrapStatic,
  FplEntry,
  FplEntryGameweekPicks,
  FplFixture,
  FplLeague,
  FplLiveGameweek,
} from '@simplyfpl/types';

export const bootstrapStatic: FplBootstrapStatic = {
  events: [
    {
      id: 1,
      name: 'Gameweek 1',
      deadline_time: '2025-08-15T17:30:00Z',
      is_current: true,
      is_next: false,
      is_previous: false,
      average_entry_score: 52,
      highest_score: 121,
      finished: false,
    },
    {
      id: 2,
      name: 'Gameweek 2',
      deadline_time: '2025-08-22T17:30:00Z',
      is_current: false,
      is_next: true,
      is_previous: false,
      average_entry_score: 0,
      highest_score: null,
      finished: false,
    },
  ],
  element_types: [
    {
      id: 1,
      plural_name: 'Goalkeepers',
      plural_name_short: 'GKP',
      singular_name: 'Goalkeeper',
      singular_name_short: 'GKP',
    },
    {
      id: 2,
      plural_name: 'Defenders',
      plural_name_short: 'DEF',
      singular_name: 'Defender',
      singular_name_short: 'DEF',
    },
    {
      id: 3,
      plural_name: 'Midfielders',
      plural_name_short: 'MID',
      singular_name: 'Midfielder',
      singular_name_short: 'MID',
    },
    {
      id: 4,
      plural_name: 'Forwards',
      plural_name_short: 'FWD',
      singular_name: 'Forward',
      singular_name_short: 'FWD',
    },
  ],
  teams: [
    { id: 1, name: 'Arsenal', short_name: 'ARS', code: 3 },
    { id: 2, name: 'Chelsea', short_name: 'CHE', code: 8 },
  ],
  elements: [
    {
      id: 1,
      web_name: 'Salah',
      first_name: 'Mohamed',
      second_name: 'Salah',
      team: 1,
      element_type: 3,
      now_cost: 135,
      total_points: 180,
      event_points: 12,
      selected_by_percent: '45.0',
      transfers_in_event: 500000,
      transfers_out_event: 50000,
      chance_of_playing_next_round: null,
      news: '',
    },
    {
      id: 2,
      web_name: 'Saka',
      first_name: 'Bukayo',
      second_name: 'Saka',
      team: 1,
      element_type: 3,
      now_cost: 105,
      total_points: 120,
      event_points: 6,
      selected_by_percent: '30.0',
      transfers_in_event: 100000,
      transfers_out_event: 80000,
      chance_of_playing_next_round: null,
      news: '',
    },
  ],
};

export const liveGameweek: FplLiveGameweek = {
  elements: [
    {
      id: 1,
      stats: {
        minutes: 90,
        goals_scored: 1,
        assists: 1,
        clean_sheets: 0,
        goals_conceded: 2,
        yellow_cards: 0,
        red_cards: 0,
        saves: 0,
        bonus: 3,
        bps: 42,
        total_points: 12,
      },
      explain: [],
    },
    {
      id: 2,
      stats: {
        minutes: 90,
        goals_scored: 0,
        assists: 1,
        clean_sheets: 0,
        goals_conceded: 0,
        yellow_cards: 0,
        red_cards: 0,
        saves: 0,
        bonus: 1,
        bps: 28,
        total_points: 6,
      },
      explain: [],
    },
  ],
};

export const entry: FplEntry = {
  id: 12345,
  player_first_name: 'Test',
  player_last_name: 'Manager',
  name: 'Test FC',
  summary_overall_rank: 500000,
  summary_overall_points: 800,
  summary_event_rank: null,
  summary_event_points: 52,
};

export const entryPicks: FplEntryGameweekPicks = {
  active_chip: null,
  automatic_subs: [],
  entry_history: {
    event: 1,
    points: 52,
    total_points: 800,
    rank: 1000000,
    rank_sort: 1000000,
    overall_rank: 500000,
    event_transfers: 0,
    event_transfers_cost: 0,
    points_on_bench: 5,
  },
  picks: [
    { element: 1, position: 1, multiplier: 2, is_captain: true, is_vice_captain: false },
    { element: 2, position: 2, multiplier: 1, is_captain: false, is_vice_captain: true },
  ],
};

export const classicLeague: FplLeague = {
  league: {
    id: 314,
    name: 'Overall',
    created: '2025-07-01T00:00:00Z',
    admin_entry: null,
    start_event: 1,
    league_type: 'x',
  },
  standings: {
    has_next: false,
    page: 1,
    results: [
      {
        id: 1,
        entry: 12345,
        entry_name: 'Test FC',
        player_name: 'Test Manager',
        rank: 1,
        last_rank: 2,
        rank_sort: 1,
        total: 800,
        event_total: 52,
      },
    ],
  },
};

export const fixtures: FplFixture[] = [
  {
    id: 1,
    event: 1,
    finished: false,
    kickoff_time: '2025-08-15T19:00:00Z',
    team_h: 1,
    team_a: 2,
    team_h_score: null,
    team_a_score: null,
    team_h_difficulty: 3,
    team_a_difficulty: 3,
  },
];
