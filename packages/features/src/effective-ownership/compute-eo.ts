import type { FplBootstrapStatic, FplPlayer } from '@simplyfpl/types';

export type EoTier = 'top_1k' | 'top_10k' | 'top_100k' | 'overall';

export type EoPosition = 'gk' | 'def' | 'mid' | 'fwd';

const POSITION_FROM_ELEMENT_TYPE: Record<number, EoPosition> = {
  1: 'gk',
  2: 'def',
  3: 'mid',
  4: 'fwd',
};

export interface CohortOwnershipStats {
  ownershipPct: number;
  captainPct: number;
}

export type CohortOwnershipMap = Record<number, CohortOwnershipStats>;

export type CohortOwnershipByTier = Record<EoTier, CohortOwnershipMap>;

export interface EoRow {
  elementId: number;
  name: string;
  teamShort: string;
  teamCode: number;
  position: EoPosition;
  nowCost: number;
  eoTop1k: number;
  eoTop10k: number;
  eoTop100k: number;
  eoOverall: number;
}

interface ComputeArgs {
  byTier: CohortOwnershipByTier;
  bootstrap: FplBootstrapStatic;
}

export function effectiveOwnership(stats: CohortOwnershipStats | undefined): number {
  if (!stats) return 0;
  return stats.ownershipPct + stats.captainPct;
}

export function computeEffectiveOwnership({ byTier, bootstrap }: ComputeArgs): EoRow[] {
  const playersById = new Map<number, FplPlayer>();
  for (const player of bootstrap.elements) playersById.set(player.id, player);

  const teamById = new Map<number, { shortName: string; code: number }>();
  for (const team of bootstrap.teams) {
    teamById.set(team.id, { shortName: team.short_name, code: team.code });
  }

  const candidateIds = new Set<number>();
  for (const tier of ['top_1k', 'top_10k', 'top_100k', 'overall'] as const) {
    const map = byTier[tier];
    if (!map) continue;
    for (const key of Object.keys(map)) candidateIds.add(Number(key));
  }

  const rows: EoRow[] = [];
  for (const elementId of candidateIds) {
    const player = playersById.get(elementId);
    if (!player) continue;
    const team = teamById.get(player.team);
    rows.push({
      elementId,
      name: player.web_name,
      teamShort: team?.shortName ?? '',
      teamCode: team?.code ?? 0,
      position: POSITION_FROM_ELEMENT_TYPE[player.element_type] ?? 'mid',
      nowCost: player.now_cost,
      eoTop1k: effectiveOwnership(byTier.top_1k?.[elementId]),
      eoTop10k: effectiveOwnership(byTier.top_10k?.[elementId]),
      eoTop100k: effectiveOwnership(byTier.top_100k?.[elementId]),
      eoOverall: effectiveOwnership(byTier.overall?.[elementId]),
    });
  }

  rows.sort((a, b) => b.eoTop10k - a.eoTop10k);
  return rows;
}
