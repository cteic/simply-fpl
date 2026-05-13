import { useEffect, useState } from 'react';

import type { PlayerSeed, Position } from './types';

const API_URL = import.meta.env.VITE_API_URL;

/** 4-4-2 mock XI used as a fallback when no worker URL is configured or the fetch fails. */
const MOCK_XI: PlayerSeed[] = [
  // GK
  {
    id: 1,
    webName: 'Raya',
    teamShort: 'ARS',
    position: 'gk',
    totalPoints: 162,
    form: 5.4,
    defaultX: 0,
    defaultZ: -22,
  },
  // DEF (back four)
  {
    id: 2,
    webName: 'Saliba',
    teamShort: 'ARS',
    position: 'def',
    totalPoints: 158,
    form: 5.0,
    defaultX: -15,
    defaultZ: -12,
  },
  {
    id: 3,
    webName: 'Van Dijk',
    teamShort: 'LIV',
    position: 'def',
    totalPoints: 151,
    form: 4.8,
    defaultX: -5,
    defaultZ: -12,
  },
  {
    id: 4,
    webName: 'Gabriel',
    teamShort: 'ARS',
    position: 'def',
    totalPoints: 144,
    form: 4.6,
    defaultX: 5,
    defaultZ: -12,
  },
  {
    id: 5,
    webName: 'Alexander-Arnold',
    teamShort: 'LIV',
    position: 'def',
    totalPoints: 138,
    form: 5.1,
    defaultX: 15,
    defaultZ: -12,
  },
  // MID
  {
    id: 6,
    webName: 'Salah',
    teamShort: 'LIV',
    position: 'mid',
    totalPoints: 287,
    form: 8.6,
    defaultX: -15,
    defaultZ: 0,
  },
  {
    id: 7,
    webName: 'Saka',
    teamShort: 'ARS',
    position: 'mid',
    totalPoints: 198,
    form: 6.7,
    defaultX: -5,
    defaultZ: 0,
  },
  {
    id: 8,
    webName: 'Foden',
    teamShort: 'MCI',
    position: 'mid',
    totalPoints: 184,
    form: 6.2,
    defaultX: 5,
    defaultZ: 0,
  },
  {
    id: 9,
    webName: 'Palmer',
    teamShort: 'CHE',
    position: 'mid',
    totalPoints: 224,
    form: 7.4,
    defaultX: 15,
    defaultZ: 0,
  },
  // FWD
  {
    id: 10,
    webName: 'Haaland',
    teamShort: 'MCI',
    position: 'fwd',
    totalPoints: 232,
    form: 7.8,
    defaultX: -7,
    defaultZ: 14,
  },
  {
    id: 11,
    webName: 'Isak',
    teamShort: 'NEW',
    position: 'fwd',
    totalPoints: 178,
    form: 6.5,
    defaultX: 7,
    defaultZ: 14,
  },
];

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

export function useFplSeedXi(): { seeds: PlayerSeed[]; isLive: boolean } {
  const [seeds, setSeeds] = useState<PlayerSeed[]>(MOCK_XI);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!API_URL) return;

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${API_URL}/fpl/bootstrap-static/`);
        if (!res.ok) throw new Error(`FPL fetch failed: ${res.status}`);
        const data = (await res.json()) as FplBootstrap;
        if (cancelled) return;
        const picked = pick442(data.elements, data.teams);
        if (picked.length === 11) {
          setSeeds(picked);
          setIsLive(true);
        }
      } catch {
        // Silently keep the MOCK_XI fallback — the demo's job is to show
        // Three.js + Y.js working, not to gate that on a worker being up.
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { seeds, isLive };
}
