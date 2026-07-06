import type {
  FplBootstrapStatic,
  FplEntry,
  FplEntryGameweekPicks,
  FplLiveGameweek,
  FplPlayer,
} from '@simplyfpl/types';

export type H2hPosition = 'gk' | 'def' | 'mid' | 'fwd';

const POSITION_FROM_ELEMENT_TYPE: Record<number, H2hPosition> = {
  1: 'gk',
  2: 'def',
  3: 'mid',
  4: 'fwd',
};

export interface H2hPlayer {
  id: number;
  name: string;
  teamShort: string;
  teamCode: number;
  position: H2hPosition;
  rawPoints: number;
  effectivePoints: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  minutes: number;
}

export interface H2hSide {
  entryId: number;
  managerName: string;
  teamName: string;
  gwPoints: number;
  transferCost: number;
  netGwPoints: number;
  overallRank: number | null;
  captain: H2hPlayer | null;
  xi: H2hPlayer[];
  bench: H2hPlayer[];
  formation: string;
}

export interface H2hResult {
  you: H2hSide;
  them: H2hSide;
  scoreDelta: number; // you.netGwPoints - them.netGwPoints
  differentialYou: H2hPlayer[];
  differentialThem: H2hPlayer[];
  commonPicks: H2hPlayer[];
}

interface ComputeArgs {
  yourEntry: FplEntry;
  theirEntry: FplEntry;
  yourPicks: FplEntryGameweekPicks;
  theirPicks: FplEntryGameweekPicks;
  bootstrap: FplBootstrapStatic;
  liveGw: FplLiveGameweek;
}

export function computeH2h({
  yourEntry,
  theirEntry,
  yourPicks,
  theirPicks,
  bootstrap,
  liveGw,
}: ComputeArgs): H2hResult {
  const playersById = new Map<number, FplPlayer>();
  for (const player of bootstrap.elements) playersById.set(player.id, player);

  const teamShortById = new Map<number, string>();
  const teamCodeById = new Map<number, number>();
  for (const team of bootstrap.teams) {
    teamShortById.set(team.id, team.short_name);
    teamCodeById.set(team.id, team.code);
  }

  const liveById = new Map(liveGw.elements.map((e) => [e.id, e]));

  function buildSide(entry: FplEntry, picks: FplEntryGameweekPicks): H2hSide {
    const xi: H2hPlayer[] = [];
    const bench: H2hPlayer[] = [];
    let captain: H2hPlayer | null = null;

    const orderedPicks = [...picks.picks].sort((a, b) => a.position - b.position);

    for (const pick of orderedPicks) {
      const player = playersById.get(pick.element);
      if (!player) continue;
      const live = liveById.get(pick.element);
      const raw = live?.stats.total_points ?? 0;
      const effective = raw * pick.multiplier;
      const built: H2hPlayer = {
        id: player.id,
        name: player.web_name,
        teamShort: teamShortById.get(player.team) ?? '',
        teamCode: teamCodeById.get(player.team) ?? 0,
        position: POSITION_FROM_ELEMENT_TYPE[player.element_type] ?? 'mid',
        rawPoints: raw,
        effectivePoints: effective,
        isCaptain: pick.is_captain,
        isViceCaptain: pick.is_vice_captain,
        minutes: live?.stats.minutes ?? 0,
      };
      if (pick.position <= 11) {
        xi.push(built);
        if (pick.is_captain) captain = built;
      } else {
        bench.push(built);
      }
    }

    const gwPoints = xi.reduce((sum, p) => sum + p.effectivePoints, 0);
    const transferCost = picks.entry_history.event_transfers_cost;

    let def = 0;
    let mid = 0;
    let fwd = 0;
    for (const p of xi) {
      if (p.position === 'def') def += 1;
      else if (p.position === 'mid') mid += 1;
      else if (p.position === 'fwd') fwd += 1;
    }

    return {
      entryId: entry.id,
      managerName: `${entry.player_first_name} ${entry.player_last_name}`.trim(),
      teamName: entry.name,
      gwPoints,
      transferCost,
      netGwPoints: gwPoints - transferCost,
      overallRank: entry.summary_overall_rank ?? null,
      captain,
      xi,
      bench,
      formation: `${def}–${mid}–${fwd}`,
    };
  }

  const you = buildSide(yourEntry, yourPicks);
  const them = buildSide(theirEntry, theirPicks);

  const yourIds = new Set(you.xi.map((p) => p.id));
  const theirIds = new Set(them.xi.map((p) => p.id));

  const differentialYou = you.xi
    .filter((p) => !theirIds.has(p.id))
    .sort((a, b) => b.effectivePoints - a.effectivePoints);
  const differentialThem = them.xi
    .filter((p) => !yourIds.has(p.id))
    .sort((a, b) => b.effectivePoints - a.effectivePoints);
  const commonPicks = you.xi
    .filter((p) => theirIds.has(p.id))
    .sort((a, b) => b.effectivePoints - a.effectivePoints);

  return {
    you,
    them,
    scoreDelta: you.netGwPoints - them.netGwPoints,
    differentialYou,
    differentialThem,
    commonPicks,
  };
}
