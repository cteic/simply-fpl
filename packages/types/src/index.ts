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
  status?: 'a' | 'd' | 'i' | 's' | 'n' | 'u';
  minutes?: number;
  clearances_blocks_interceptions?: number;
  tackles?: number;
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

// DefCon (defensive contribution) bonus progress for a player in the current GW
export interface DefConProgress {
  eligible: boolean;
  current: number;
  threshold: number;
  percentage: number;
  awarded: boolean;
  cbi: number;
  tackles: number;
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
    clearances_blocks_interceptions: number;
    tackles: number;
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
export interface FplEntryLeague {
  id: number;
  name: string;
  short_name: string | null;
  league_type: 'x' | 'c' | 's';
  entry_rank: number | null;
}

export interface FplEntry {
  id: number;
  player_first_name: string;
  player_last_name: string;
  name: string; // team name
  summary_overall_rank: number;
  summary_overall_points: number;
  summary_event_rank: number | null;
  summary_event_points: number;
  leagues?: {
    classic: FplEntryLeague[];
    h2h: FplEntryLeague[];
  };
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
  id: number;
  event: number | null;
  started?: boolean;
  finished: boolean;
  finished_provisional?: boolean;
  kickoff_time: string | null;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  team_h_difficulty: FplDifficulty;
  team_a_difficulty: FplDifficulty;
}

export interface FplEntrySnapshot {
  bootstrap: FplBootstrapStatic;
  entry: FplEntry;
  picks: FplEntryGameweekPicks | null;
  gw: number;
  picksAvailable: boolean;
}

export type BootstrapLitePlayer = Pick<
  FplPlayer,
  'id' | 'web_name' | 'team' | 'element_type' | 'selected_by_percent' | 'now_cost'
>;

export type BootstrapLiteTeam = Pick<FplTeam, 'id' | 'short_name' | 'code'>;

export type BootstrapLiteEvent = Pick<
  FplEvent,
  'id' | 'average_entry_score' | 'is_current' | 'is_next'
>;

export interface BootstrapLite {
  elements: BootstrapLitePlayer[];
  teams: BootstrapLiteTeam[];
  events: BootstrapLiteEvent[];
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

export type ThemeName = 'stadium' | 'bold' | 'quiet';

export interface ScorePercentiles {
  p1: number;
  p5: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface ScoreHistogramBin {
  min: number;
  max: number;
  count: number;
}

export interface ScoreDistribution {
  sampleSize: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  percentiles: ScorePercentiles;
  histogram: ScoreHistogramBin[];
}

export type RankDistributionCohort = 'overall' | 'top_100k' | 'top_10k' | 'top_1k' | 'legendary';

export interface RankDistribution extends ScoreDistribution {
  gw: number;
  cohort: RankDistributionCohort;
}

export interface ScoreDistributionFileCohorts {
  top_10k?: ScoreDistribution;
  top_1k?: ScoreDistribution;
  top_100k?: ScoreDistribution;
  overall?: ScoreDistribution;
  legendary?: ScoreDistribution;
}

export interface ScoreDistributionFile {
  gw: number;
  builtAt: string;
  binSize: number;
  cohorts: ScoreDistributionFileCohorts;
}

export type Percentiles = ScorePercentiles;

export interface ComparisonSiteEntry {
  slug: string;
  label: string;
  url: string;
  timeToFirstData: number | null;
  totalBytes: number;
  thirdPartyCount: number;
  screenshotKey: string;
}

export interface ComparisonSnapshot {
  measuredAt: string;
  week: string;
  sites: ComparisonSiteEntry[];
}

// Detailed league / rivals table row (presentational contract for #113)
export interface DetailedLeagueCaptain {
  name: string;
  points: number;
  multiplier: number; // 2 = (C), 3 = (TC)
}

export interface DetailedLeagueRowData {
  position: number;
  managerName: string;
  teamName: string;
  entryId: number;
  overallRank: number | null;
  gwPoints: number; // gross GW points, before any transfer hit
  transferHits: number; // points cost of hits this GW (positive, e.g. 4)
  totalPoints: number;
  captain: DetailedLeagueCaptain | null;
  benchPointsWasted: number;
  activeChip: string | null;
  transfersOut: string[];
  transfersIn: string[];
  playersPlayed: number;
  playersTotal: number;
  rankMovement?: number; // positive = climbed, negative = dropped
  isYou?: boolean;
}

export * from './db';
export * from './frank';
export * from './notifications';

export type PlayerNewsStatus = 'available' | 'doubt' | 'suspended' | 'injured' | 'unavailable';

export interface PlayerNewsItem {
  id: number;
  web_name: string;
  element_type: number;
  team_id: number;
  chance_of_playing_next_round: number | null;
  news: string;
  status: PlayerNewsStatus;
}

export interface TeamNewsGroup {
  team_id: number;
  team_name: string;
  team_short_name: string;
  players: PlayerNewsItem[];
}

export interface TeamNewsResponse {
  generated_at: string;
  teams: TeamNewsGroup[];
}

export interface EntryNewsResponse {
  generated_at: string;
  entry_id: number;
  players: PlayerNewsItem[];
}
