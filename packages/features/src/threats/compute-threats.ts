import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplLiveGameweek,
  FplPlayer,
} from '@simplyfpl/types';

import type { CohortSnapshotPayload } from '../cohorts/types';

export type ThreatPosition = 'gk' | 'def' | 'mid' | 'fwd';

const POSITION_FROM_ELEMENT_TYPE: Record<number, ThreatPosition> = {
  1: 'gk',
  2: 'def',
  3: 'mid',
  4: 'fwd',
};

export interface Threat {
  elementId: number;
  name: string;
  teamShort: string;
  teamCode: number;
  position: ThreatPosition;
  ownedByCount: number;
  ownedByPct: number;
  captainPct: number;
  effectiveOwnershipPct: number;
  livePoints: number;
  liveRankImpactIfTheyHaul: number;
}

interface ComputeArgs {
  yourPicks: FplEntryGameweekPicks;
  cohort: CohortSnapshotPayload;
  bootstrap: FplBootstrapStatic;
  liveGw: FplLiveGameweek;
  haulPoints?: number;
}

const DEFAULT_HAUL_POINTS = 8;

export function computeThreats({
  yourPicks,
  cohort,
  bootstrap,
  liveGw,
  haulPoints = DEFAULT_HAUL_POINTS,
}: ComputeArgs): Threat[] {
  const yourElementIds = new Set(yourPicks.picks.map((p) => p.element));

  const playersById = new Map<number, FplPlayer>();
  for (const player of bootstrap.elements) playersById.set(player.id, player);

  const teamById = new Map<number, { shortName: string; code: number }>();
  for (const team of bootstrap.teams) {
    teamById.set(team.id, { shortName: team.short_name, code: team.code });
  }

  const liveById = new Map(liveGw.elements.map((e) => [e.id, e]));

  const cohortSize = cohort.entries_sampled;
  if (cohortSize <= 0) return [];

  const startingCounts = new Map<number, number>();
  for (const own of cohort.ownership) {
    startingCounts.set(own.player_id, own.starting_count);
  }
  const captainCounts = new Map<number, number>();
  for (const cap of cohort.captains) {
    captainCounts.set(cap.player_id, cap.count);
  }

  const threats: Threat[] = [];

  for (const [elementId, ownedByCount] of startingCounts) {
    if (yourElementIds.has(elementId)) continue;
    const player = playersById.get(elementId);
    if (!player) continue;
    const team = teamById.get(player.team);
    const teamShort = team?.shortName ?? '';
    const teamCode = team?.code ?? 0;
    const ownedByPct = (ownedByCount / cohortSize) * 100;
    const captainCount = captainCounts.get(elementId) ?? 0;
    const captainPct = (captainCount / cohortSize) * 100;
    const effectiveOwnershipPct = ownedByPct + captainPct;
    const livePoints = liveById.get(elementId)?.stats.total_points ?? 0;
    const liveRankImpactIfTheyHaul = (effectiveOwnershipPct / 100) * haulPoints;

    threats.push({
      elementId,
      name: player.web_name,
      teamShort,
      teamCode,
      position: POSITION_FROM_ELEMENT_TYPE[player.element_type] ?? 'mid',
      ownedByCount,
      ownedByPct,
      captainPct,
      effectiveOwnershipPct,
      livePoints,
      liveRankImpactIfTheyHaul,
    });
  }

  threats.sort((a, b) => b.liveRankImpactIfTheyHaul - a.liveRankImpactIfTheyHaul);
  return threats;
}
