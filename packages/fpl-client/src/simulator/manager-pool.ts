import type { FplEntryGameweekPicks, FplEntryPick } from '@simplyfpl/types';

import { mulberry32, pickWeightedIndex } from './prng';

export const GK_TYPE = 1;
export const DEF_TYPE = 2;
export const MID_TYPE = 3;
export const FWD_TYPE = 4;

export interface SquadPlayer {
  id: number;
  elementType: number;
  strength: number;
}

export interface Formation {
  def: number;
  mid: number;
  fwd: number;
}

export interface CompactManager {
  id: number;
  captain: number;
  xi: number[];
}

export interface ManagerDistribution {
  gw: number;
  seed: number;
  size: number;
  squad: SquadPlayer[];
  managers: CompactManager[];
}

export interface BuildManagerPoolArgs {
  gw: number;
  seed: number;
  size: number;
  squad: SquadPlayer[];
  baseEntryId?: number;
}

const FORMATIONS: ReadonlyArray<{ formation: Formation; weight: number }> = [
  { formation: { def: 3, mid: 4, fwd: 3 }, weight: 6 },
  { formation: { def: 3, mid: 5, fwd: 2 }, weight: 5 },
  { formation: { def: 4, mid: 4, fwd: 2 }, weight: 5 },
  { formation: { def: 4, mid: 3, fwd: 3 }, weight: 4 },
  { formation: { def: 5, mid: 3, fwd: 2 }, weight: 3 },
  { formation: { def: 4, mid: 5, fwd: 1 }, weight: 2 },
  { formation: { def: 5, mid: 4, fwd: 1 }, weight: 2 },
  { formation: { def: 5, mid: 2, fwd: 3 }, weight: 1 },
];

function byType(squad: SquadPlayer[], elementType: number): SquadPlayer[] {
  return squad.filter((p) => p.elementType === elementType);
}

function sampleWithoutReplacement(
  players: SquadPlayer[],
  count: number,
  rng: () => number,
  weightOf: (p: SquadPlayer) => number
): SquadPlayer[] {
  const pool = [...players];
  const chosen: SquadPlayer[] = [];
  const take = Math.min(count, pool.length);
  for (let i = 0; i < take; i++) {
    const weights = pool.map(weightOf);
    const index = pickWeightedIndex(weights, rng());
    const picked = pool[index];
    if (!picked) break;
    chosen.push(picked);
    pool.splice(index, 1);
  }
  return chosen;
}

function startWeight(player: SquadPlayer): number {
  return player.strength + 1;
}

function captainWeight(player: SquadPlayer): number {
  const base = player.strength + 1;
  return base * base;
}

export function buildManagerPool({
  gw,
  seed,
  size,
  squad,
  baseEntryId = 1,
}: BuildManagerPoolArgs): ManagerDistribution {
  const rng = mulberry32(seed + gw);
  const keepers = byType(squad, GK_TYPE);
  const defenders = byType(squad, DEF_TYPE);
  const midfielders = byType(squad, MID_TYPE);
  const forwards = byType(squad, FWD_TYPE);
  const formationWeights = FORMATIONS.map((f) => f.weight);

  const managers: CompactManager[] = [];
  for (let i = 0; i < size; i++) {
    const keeper = sampleWithoutReplacement(keepers, 1, rng, startWeight)[0];
    const formationEntry = FORMATIONS[pickWeightedIndex(formationWeights, rng())];
    if (!keeper || !formationEntry) continue;
    const { formation } = formationEntry;

    const startingDef = sampleWithoutReplacement(defenders, formation.def, rng, startWeight);
    const startingMid = sampleWithoutReplacement(midfielders, formation.mid, rng, startWeight);
    const startingFwd = sampleWithoutReplacement(forwards, formation.fwd, rng, startWeight);
    const outfield = [...startingDef, ...startingMid, ...startingFwd];
    const xiPlayers = [keeper, ...outfield];

    const captainWeights = xiPlayers.map(captainWeight);
    const captain = xiPlayers[pickWeightedIndex(captainWeights, rng())];
    if (!captain) continue;

    managers.push({
      id: baseEntryId + i,
      captain: captain.id,
      xi: xiPlayers.map((p) => p.id),
    });
  }

  return { gw, seed, size, squad, managers };
}

export function expandManager(
  manager: CompactManager,
  squad: SquadPlayer[],
  gw: number
): FplEntryGameweekPicks {
  const benchIds = squad.map((p) => p.id).filter((id) => !manager.xi.includes(id));
  const picks: FplEntryPick[] = [];

  manager.xi.forEach((element, index) => {
    const isCaptain = element === manager.captain;
    picks.push({
      element,
      position: index + 1,
      multiplier: isCaptain ? 2 : 1,
      is_captain: isCaptain,
      is_vice_captain: false,
    });
  });

  benchIds.forEach((element, index) => {
    picks.push({
      element,
      position: 12 + index,
      multiplier: 0,
      is_captain: false,
      is_vice_captain: false,
    });
  });

  return {
    active_chip: null,
    automatic_subs: [],
    entry_history: {
      event: gw,
      points: 0,
      total_points: 0,
      rank: 0,
      rank_sort: 0,
      overall_rank: 0,
      event_transfers: 0,
      event_transfers_cost: 0,
      points_on_bench: 0,
    },
    picks,
  };
}
