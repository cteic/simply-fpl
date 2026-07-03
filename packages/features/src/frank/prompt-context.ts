import type { FplEntrySnapshot, FplFixture } from '@simplyfpl/types';

export interface FrankPriceChange {
  id: number;
  web_name: string;
  direction: 'rise' | 'fall';
  probability: number;
}

export interface FrankContextInput {
  snapshot: FplEntrySnapshot | null;
  fixtures: FplFixture[] | null;
  priceChanges: FrankPriceChange[] | null;
  currentGw: number;
}

function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = ((hash << 5) + hash) ^ c;
    hash = hash & hash;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function normalizeQuestion(question: string): string {
  return question.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function computeSquadHash(pickIds: number[]): string {
  return djb2(
    pickIds
      .slice()
      .sort((a, b) => a - b)
      .join(':')
  );
}

export function computeFrankAskCacheKey(question: string, pickIds: number[]): string {
  return `frank:ask:${djb2(normalizeQuestion(question))}:${computeSquadHash(pickIds)}`;
}

export function buildEnrichedContext(input: FrankContextInput): string {
  const { snapshot, fixtures, priceChanges, currentGw } = input;

  if (!snapshot) return '';

  const playerById = new Map(snapshot.bootstrap.elements.map((p) => [p.id, p]));
  const teamById = new Map(snapshot.bootstrap.teams.map((t) => [t.id, t]));

  const fdrMap = new Map<number, number[]>();
  if (fixtures) {
    const nextGws = [currentGw + 1, currentGw + 2, currentGw + 3];
    for (const gw of nextGws) {
      for (const f of fixtures.filter((fix) => fix.event === gw)) {
        const hArr = fdrMap.get(f.team_h) ?? [];
        hArr.push(f.team_h_difficulty);
        fdrMap.set(f.team_h, hArr);
        const aArr = fdrMap.get(f.team_a) ?? [];
        aArr.push(f.team_a_difficulty);
        fdrMap.set(f.team_a, aArr);
      }
    }
  }

  const priceMap = new Map<number, FrankPriceChange>();
  if (priceChanges) {
    for (const pc of priceChanges) {
      priceMap.set(pc.id, pc);
    }
  }

  if (snapshot.picks) {
    const squadRows = snapshot.picks.picks.map((pick) => {
      const player = playerById.get(pick.element);
      const team = player ? teamById.get(player.team) : undefined;
      const fdr = team ? (fdrMap.get(team.id) ?? []) : [];
      const pc = priceMap.get(pick.element);
      return {
        id: pick.element,
        name: player?.web_name ?? String(pick.element),
        team: team?.short_name ?? '?',
        bench: pick.position > 11,
        captain: pick.is_captain || undefined,
        vc: pick.is_vice_captain || undefined,
        multiplier: pick.multiplier > 1 ? pick.multiplier : undefined,
        next_fdr: fdr.length > 0 ? fdr.slice(0, 3) : undefined,
        price_dir: pc?.direction ?? undefined,
      };
    });

    return JSON.stringify({
      gw: snapshot.gw,
      active_chip: snapshot.picks.active_chip,
      gw_pts: snapshot.picks.entry_history?.points,
      total_pts: snapshot.picks.entry_history?.total_points,
      overall_rank: snapshot.entry?.summary_overall_rank,
      event_rank: snapshot.entry?.summary_event_rank,
      squad: squadRows,
    });
  }

  if (snapshot.entry) {
    return JSON.stringify({
      gw: snapshot.gw,
      overall_rank: snapshot.entry.summary_overall_rank,
      overall_pts: snapshot.entry.summary_overall_points,
    });
  }

  return '';
}
