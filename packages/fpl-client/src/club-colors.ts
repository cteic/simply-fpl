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

export function getClubColor(shortName: string | undefined | null): string | undefined {
  if (!shortName) return undefined;
  return CLUB_COLORS[shortName.trim().toUpperCase()];
}
