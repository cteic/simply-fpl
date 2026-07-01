import type { DetailedLeagueCaptain, DetailedLeagueRowData } from '@simplyfpl/types';

const CHIP_LABEL: Record<string, string> = {
  bboost: 'BB',
  '3xc': 'TC',
  freehit: 'FH',
  wildcard: 'WC',
};

export interface DetailedLeagueTransferSummary {
  out: string;
  in: string;
  hitLabel: string | null;
}

export interface DetailedLeagueRowView {
  highlighted: boolean;
  gwScoreLabel: string;
  netGwScore: number;
  hitLabel: string | null;
  captainLabel: string | null;
  benchWaste: string | null;
  chipLabel: string | null;
  transferSummary: DetailedLeagueTransferSummary | null;
  playedLabel: string;
  allPlayed: boolean;
}

function chipLabel(chip: string | null): string | null {
  if (chip === null) return null;
  return CHIP_LABEL[chip] ?? chip.toUpperCase();
}

function captainLabel(captain: DetailedLeagueCaptain | null): string | null {
  if (captain === null) return null;
  const suffix = captain.multiplier === 3 ? '(TC)' : '(C)';
  const contribution = captain.points * captain.multiplier;
  return `${captain.name} ${suffix} · ${contribution}`;
}

function transferSummary(data: DetailedLeagueRowData): DetailedLeagueTransferSummary | null {
  if (data.transfersOut.length === 0 && data.transfersIn.length === 0) return null;
  const hitLabel = data.transferHits > 0 ? `-${data.transferHits}` : null;
  return {
    out: data.transfersOut.join(', '),
    in: data.transfersIn.join(', '),
    hitLabel,
  };
}

export function buildDetailedLeagueRowView(data: DetailedLeagueRowData): DetailedLeagueRowView {
  const netGwScore = data.gwPoints - data.transferHits;
  const hitLabel = data.transferHits > 0 ? `-${data.transferHits}` : null;
  const gwScoreLabel =
    data.transferHits > 0 ? `${data.gwPoints} (${hitLabel}) = ${netGwScore}` : `${data.gwPoints}`;
  return {
    highlighted: data.isYou === true,
    gwScoreLabel,
    netGwScore,
    hitLabel,
    captainLabel: captainLabel(data.captain),
    benchWaste: data.benchPointsWasted > 0 ? `${data.benchPointsWasted} pts wasted` : null,
    chipLabel: chipLabel(data.activeChip),
    transferSummary: transferSummary(data),
    playedLabel: `${data.playersPlayed}/${data.playersTotal} played`,
    allPlayed: data.playersPlayed >= data.playersTotal,
  };
}

export function toggleExpanded(expanded: boolean): boolean {
  return !expanded;
}
