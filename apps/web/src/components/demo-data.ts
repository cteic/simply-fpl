import type { BadgeTone, LeagueTableRow, PlannerGwCell, ShirtKind } from '@simplyfpl/ui';

export interface DemoPlayer {
  name: string;
  detail: string;
  position: ShirtKind;
  badge?: string;
  badgeTone?: BadgeTone;
  bench?: boolean;
}

export const DEMO_FORMATION: DemoPlayer[][] = [
  [{ name: 'Flekken', detail: 'BRE', position: 'gk', badge: '6' }],
  [
    { name: 'TAA', detail: 'LIV', position: 'def', badge: '8' },
    { name: 'Gabriel', detail: 'ARS', position: 'def', badge: '14', badgeTone: 'hot' },
    { name: 'Pedro Porro', detail: 'TOT', position: 'def', badge: '6' },
    { name: 'Mykolenko', detail: 'EVE', position: 'def', badge: '2', badgeTone: 'bench' },
  ],
  [
    { name: 'Salah (C)', detail: 'LIV · TBP', position: 'mid', badge: '–', badgeTone: 'tbp' },
    { name: 'Palmer', detail: 'CHE', position: 'mid', badge: '12', badgeTone: 'hot' },
    { name: 'Andreas', detail: 'FUL', position: 'mid', badge: '5' },
    { name: 'Mbeumo', detail: 'BRE', position: 'mid', badge: '1', badgeTone: 'bench' },
  ],
  [
    { name: 'Haaland', detail: 'MCI', position: 'fwd', badge: '13', badgeTone: 'hot' },
    { name: 'Isak', detail: 'NEW · TBP', position: 'fwd', badge: '–', badgeTone: 'tbp' },
  ],
];

export const DEMO_BENCH: DemoPlayer[] = [
  { name: 'Raya', detail: 'ARS', position: 'gk', badge: '6', badgeTone: 'bench', bench: true },
  { name: 'Dunk', detail: 'BHA', position: 'def', badge: '2', badgeTone: 'bench', bench: true },
  { name: 'Wissa', detail: 'BRE', position: 'fwd', badge: '3', badgeTone: 'bench', bench: true },
  { name: 'Núñez', detail: 'LIV', position: 'fwd', badge: '1', badgeTone: 'bench', bench: true },
];

export const DEMO_MINI_LEAGUE_ROWS: LeagueTableRow[] = [
  {
    position: 1,
    managerName: 'GW King FC',
    teamName: "James O'Brien",
    gwScore: 71,
    totalPoints: '1,842',
  },
  {
    position: 2,
    managerName: 'Saka Boom',
    teamName: 'Aoife Murphy',
    gwScore: 68,
    totalPoints: '1,819',
  },
  {
    position: 3,
    managerName: "Peter's United",
    teamName: 'Pete Walsh',
    isYou: true,
    gwScore: 67,
    totalPoints: '1,804',
  },
  {
    position: 4,
    managerName: "Haaland's Heroes",
    teamName: 'Ciarán Kelly',
    gwScore: 54,
    totalPoints: '1,791',
  },
  {
    position: 5,
    managerName: 'Palmer FC',
    teamName: 'Sinéad Byrne',
    gwScore: 49,
    totalPoints: '1,766',
  },
];

export const DEMO_GIBBINGTONS_ROWS: LeagueTableRow[] = [
  {
    position: 1,
    managerName: "Peter's United",
    teamName: 'Pete Walsh',
    isYou: true,
    gwScore: 67,
    totalPoints: '1,804',
  },
  {
    position: 2,
    managerName: 'Saka Boom',
    teamName: 'Aoife Murphy',
    gwScore: 68,
    totalPoints: '1,801',
  },
  {
    position: 3,
    managerName: 'GW King FC',
    teamName: "James O'Brien",
    gwScore: 71,
    totalPoints: '1,799',
  },
  {
    position: 4,
    managerName: "Haaland's Heroes",
    teamName: 'Ciarán Kelly',
    gwScore: 54,
    totalPoints: '1,791',
  },
  {
    position: 5,
    managerName: 'Palmer FC',
    teamName: 'Sinéad Byrne',
    gwScore: 49,
    totalPoints: '1,766',
  },
];

export const DEMO_WORK_LEAGUE_ROWS: LeagueTableRow[] = [
  {
    position: 1,
    managerName: 'Salah My Ride',
    teamName: 'Dan Higgins',
    gwScore: 74,
    totalPoints: '1,866',
  },
  {
    position: 2,
    managerName: 'Script Error FC',
    teamName: 'Emer Doyle',
    gwScore: 69,
    totalPoints: '1,832',
  },
  {
    position: 7,
    managerName: "Peter's United",
    teamName: 'Pete Walsh',
    isYou: true,
    gwScore: 67,
    totalPoints: '1,804',
  },
];

export interface DemoPriceRow {
  name: string;
  club: string;
  flow: 'rise' | 'fall';
  value: string;
  probability: number;
}

export const DEMO_PRICE_ROWS: DemoPriceRow[] = [
  { name: 'M. Salah', club: 'MID · LIV', flow: 'rise', value: '£13.2m', probability: 91 },
  { name: 'E. Haaland', club: 'FWD · MCI', flow: 'rise', value: '£14.7m', probability: 78 },
  { name: 'C. Palmer', club: 'MID · CHE', flow: 'rise', value: '£11.1m', probability: 61 },
  { name: 'B. Mbeumo', club: 'MID · BRE', flow: 'fall', value: '£7.8m', probability: 44 },
  { name: 'A. Isak', club: 'FWD · NEW', flow: 'fall', value: '£9.2m', probability: 28 },
];

export const DEMO_BIG_PRICE_ROWS: DemoPriceRow[] = [
  {
    name: 'M. Salah',
    club: 'MID · Liverpool · £13.2m',
    flow: 'rise',
    value: '+0.1m',
    probability: 91,
  },
  {
    name: 'E. Haaland',
    club: 'FWD · Man City · £14.7m',
    flow: 'rise',
    value: '+0.1m',
    probability: 78,
  },
  {
    name: 'C. Palmer',
    club: 'MID · Chelsea · £11.1m',
    flow: 'rise',
    value: '+0.1m',
    probability: 61,
  },
  {
    name: 'L. Díaz',
    club: 'MID · Liverpool · £7.6m',
    flow: 'rise',
    value: '+0.1m',
    probability: 55,
  },
  { name: 'B. Saka', club: 'MID · Arsenal · £9.8m', flow: 'rise', value: '+0.1m', probability: 48 },
  {
    name: 'B. Mbeumo',
    club: 'MID · Brentford · £7.8m',
    flow: 'fall',
    value: '−0.1m',
    probability: 44,
  },
  {
    name: 'A. Isak',
    club: 'FWD · Newcastle · £9.2m',
    flow: 'fall',
    value: '−0.1m',
    probability: 28,
  },
  {
    name: 'D. Solanke',
    club: 'FWD · Tottenham · £7.4m',
    flow: 'fall',
    value: '−0.1m',
    probability: 21,
  },
];

export const DEMO_PLANNER_CELLS: PlannerGwCell[] = [
  {
    label: 'GW31 · Deadline Sat',
    players: [
      { name: 'Salah', form: 'good', fdr: 2 },
      { name: 'Haaland', form: 'good', fdr: 3 },
      { name: 'Palmer', form: 'avg', fdr: 2 },
      { name: 'Gabriel', form: 'warning', fdr: 4 },
      { name: 'Isak', form: 'none', fdr: 3 },
    ],
  },
  {
    label: 'GW32',
    players: [
      { name: 'Salah', form: 'good', fdr: 1 },
      { name: 'Haaland', form: 'good', fdr: 2 },
      { name: 'Palmer', form: 'avg', fdr: 3 },
      { name: 'Gabriel', form: 'warning', fdr: 2 },
      { name: 'Isak', form: 'good', fdr: 2 },
    ],
  },
  {
    label: 'GW33 · DGW',
    players: [
      { name: 'Salah', form: 'good', fdr: 2 },
      { name: 'Haaland', form: 'bad', fdr: 5 },
      { name: 'Palmer', form: 'avg', fdr: 2 },
      { name: 'Gabriel', form: 'good', fdr: 1 },
      { name: 'Isak ×2', form: 'good', fdr: 3 },
    ],
  },
  {
    label: 'GW34',
    players: [
      { name: 'Salah', form: 'good', fdr: 2 },
      { name: 'Haaland', form: 'good', fdr: 2 },
      { name: 'Palmer', form: 'warning', fdr: 3 },
      { name: 'Gabriel', form: 'none', fdr: 4 },
      { name: 'Isak', form: 'avg', fdr: 2 },
    ],
  },
  {
    label: 'GW35',
    players: [
      { name: 'Salah', form: 'good', fdr: 1 },
      { name: 'Haaland', form: 'good', fdr: 2 },
      { name: 'Palmer', form: 'good', fdr: 2 },
      { name: 'Gabriel', form: 'good', fdr: 2 },
      { name: 'Isak', form: 'good', fdr: 1 },
    ],
  },
];
