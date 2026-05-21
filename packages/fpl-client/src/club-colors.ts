/**
 * Primary club colours keyed by FPL team short name (e.g. "LIV", "MCI").
 *
 * Used for small club-identity accents (dots / stripes) in player lists and on
 * the pitch. Pure data — no React. Falls back to undefined for unknown clubs
 * so consumers can choose a neutral.
 */

const CLUB_COLORS: Record<string, string> = {
  ARS: '#EF0107', // Arsenal
  AVL: '#670E36', // Aston Villa
  BOU: '#DA291C', // Bournemouth
  BRE: '#E30613', // Brentford
  BHA: '#0057B8', // Brighton
  BUR: '#6C1D45', // Burnley
  CHE: '#034694', // Chelsea
  CRY: '#1B458F', // Crystal Palace
  EVE: '#003399', // Everton
  FUL: '#1A1A18', // Fulham
  IPS: '#0044A9', // Ipswich
  LEE: '#1D428A', // Leeds
  LEI: '#003090', // Leicester
  LIV: '#C8102E', // Liverpool
  MCI: '#6CABDD', // Man City
  MUN: '#DA291C', // Man United
  NEW: '#241F20', // Newcastle
  NFO: '#DD0000', // Nottingham Forest
  SHU: '#EE2737', // Sheffield United
  SOU: '#D71920', // Southampton
  SUN: '#EB172B', // Sunderland
  TOT: '#132257', // Tottenham
  WHU: '#7A263A', // West Ham
  WOL: '#FDB913', // Wolves
  LUT: '#F78F1E', // Luton
};

// Full team names (as used by the FPL API `team_name`) mapped to short codes,
// so the same helper works for both "LIV" and "Liverpool".
const NAME_TO_SHORT: Record<string, string> = {
  ARSENAL: 'ARS',
  'ASTON VILLA': 'AVL',
  BOURNEMOUTH: 'BOU',
  BRENTFORD: 'BRE',
  BRIGHTON: 'BHA',
  'BRIGHTON & HOVE ALBION': 'BHA',
  BURNLEY: 'BUR',
  CHELSEA: 'CHE',
  'CRYSTAL PALACE': 'CRY',
  EVERTON: 'EVE',
  FULHAM: 'FUL',
  IPSWICH: 'IPS',
  LEEDS: 'LEE',
  LEICESTER: 'LEI',
  LIVERPOOL: 'LIV',
  'MAN CITY': 'MCI',
  'MANCHESTER CITY': 'MCI',
  'MAN UTD': 'MUN',
  'MAN UNITED': 'MUN',
  'MANCHESTER UNITED': 'MUN',
  NEWCASTLE: 'NEW',
  "NOTT'M FOREST": 'NFO',
  'NOTTINGHAM FOREST': 'NFO',
  'SHEFFIELD UTD': 'SHU',
  SOUTHAMPTON: 'SOU',
  SUNDERLAND: 'SUN',
  SPURS: 'TOT',
  TOTTENHAM: 'TOT',
  'TOTTENHAM HOTSPUR': 'TOT',
  'WEST HAM': 'WHU',
  WOLVES: 'WOL',
  LUTON: 'LUT',
};

export function getClubColor(team: string | undefined | null): string | undefined {
  if (!team) return undefined;
  const key = team.trim().toUpperCase();
  return CLUB_COLORS[key] ?? CLUB_COLORS[NAME_TO_SHORT[key] ?? ''];
}
