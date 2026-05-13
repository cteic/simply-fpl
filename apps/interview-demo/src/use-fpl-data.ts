import { useEffect, useState } from 'react';

import type { PlayerSeed, Position } from './types';

const API_URL =
  import.meta.env.VITE_API_URL ?? 'https://simply-fpl-worker.peterwatters.workers.dev';

interface FplPlayer {
  id: number;
  web_name: string;
  team: number;
  element_type: number;
  total_points: number;
  form: string;
}

interface FplTeam {
  id: number;
  short_name: string;
}

interface FplBootstrap {
  elements: FplPlayer[];
  teams: FplTeam[];
}

const POSITION_FROM_ELEMENT_TYPE: Record<number, Position> = {
  1: 'gk',
  2: 'def',
  3: 'mid',
  4: 'fwd',
};

/**
 * Picks 11 starters in a 4-4-2 from the highest-scoring FPL players.
 * Returns default x/z coordinates for each pitch position (pitch is 40 wide × 60 deep, centred at 0,0).
 */
function pick442(players: FplPlayer[], teams: FplTeam[]): PlayerSeed[] {
  const teamShortById = new Map(teams.map((t) => [t.id, t.short_name]));

  function topN(elementType: number, n: number) {
    return players
      .filter((p) => p.element_type === elementType)
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, n);
  }

  const gk = topN(1, 1);
  const defs = topN(2, 4);
  const mids = topN(3, 4);
  const fwds = topN(4, 2);

  function toSeed(p: FplPlayer, defaultX: number, defaultZ: number): PlayerSeed {
    return {
      id: p.id,
      webName: p.web_name,
      teamShort: teamShortById.get(p.team) ?? '',
      position: POSITION_FROM_ELEMENT_TYPE[p.element_type] ?? 'mid',
      totalPoints: p.total_points,
      form: Number.parseFloat(p.form) || 0,
      defaultX,
      defaultZ,
    };
  }

  const seeds: PlayerSeed[] = [];

  // GK (own goal area)
  if (gk[0]) seeds.push(toSeed(gk[0], 0, -22));

  // Defenders — back four
  defs.forEach((p, i) => {
    const x = -15 + i * 10;
    seeds.push(toSeed(p, x, -12));
  });

  // Midfielders — across the middle
  mids.forEach((p, i) => {
    const x = -15 + i * 10;
    seeds.push(toSeed(p, x, 0));
  });

  // Forwards — split up top
  fwds.forEach((p, i) => {
    const x = -7 + i * 14;
    seeds.push(toSeed(p, x, 14));
  });

  return seeds;
}

export function useFplSeedXi(): { seeds: PlayerSeed[] | null; error: string | null } {
  const [seeds, setSeeds] = useState<PlayerSeed[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${API_URL}/fpl/bootstrap-static/`);
        if (!res.ok) throw new Error(`FPL fetch failed: ${res.status}`);
        const data = (await res.json()) as FplBootstrap;
        if (cancelled) return;
        setSeeds(pick442(data.elements, data.teams));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { seeds, error };
}
