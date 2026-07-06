import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplFixture,
  FplLiveGameweek,
  FplPlayer,
} from '@simplyfpl/types';

import type { CohortSnapshotPayload } from '../cohorts/types';
import { type ThreatPlayingStatus, derivePlayingStatus } from './playing-status';

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
  minutes: number;
  liveRankImpactIfTheyHaul: number;
  pointsLostToThreat: number;
  scorePct: number | null;
  playingStatus: ThreatPlayingStatus;
}

export type ThreatStatusFilter = 'all' | ThreatPlayingStatus;

interface ComputeArgs {
  yourPicks: FplEntryGameweekPicks;
  cohort: CohortSnapshotPayload;
  bootstrap: FplBootstrapStatic;
  liveGw: FplLiveGameweek;
  fixtures: FplFixture[];
  haulPoints?: number;
  nowMs?: number;
}

const DEFAULT_HAUL_POINTS = 8;

export function filterThreatsByStatus(threats: Threat[], filter: ThreatStatusFilter): Threat[] {
  if (filter === 'all') return threats;
  return threats.filter((threat) => threat.playingStatus === filter);
}

export function computeThreats({
  yourPicks,
  cohort,
  bootstrap,
  liveGw,
  fixtures,
  haulPoints = DEFAULT_HAUL_POINTS,
  nowMs = Date.now(),
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
    const live = liveById.get(elementId);
    const livePoints = live?.stats.total_points ?? 0;
    const minutes = live?.stats.minutes ?? 0;
    const liveRankImpactIfTheyHaul = (effectiveOwnershipPct / 100) * haulPoints;
    const pointsLostToThreat = (effectiveOwnershipPct / 100) * livePoints;
    const scorePct =
      cohort.avg_event_points > 0 ? (pointsLostToThreat / cohort.avg_event_points) * 100 : null;
    const playingStatus = derivePlayingStatus({
      teamId: player.team,
      fixtures,
      minutes,
      nowMs,
    });

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
      minutes,
      liveRankImpactIfTheyHaul,
      pointsLostToThreat,
      scorePct,
      playingStatus,
    });
  }

  threats.sort((a, b) => b.liveRankImpactIfTheyHaul - a.liveRankImpactIfTheyHaul);
  return threats;
}
