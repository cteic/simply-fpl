import type { FplEntryGameweekPicks } from '@simplyfpl/types';

export interface Differentials {
  theirsOnly: number[];
  yoursOnly: number[];
  captaincyDiff: {
    yours: number | null;
    theirs: number | null;
    same: boolean;
  };
}

export function computeDifferentials(
  yourPicks: FplEntryGameweekPicks,
  theirPicks: FplEntryGameweekPicks
): Differentials {
  const yourXiIds = new Set(yourPicks.picks.filter((p) => p.position <= 11).map((p) => p.element));
  const theirXiIds = new Set(
    theirPicks.picks.filter((p) => p.position <= 11).map((p) => p.element)
  );

  const theirsOnly = [...theirXiIds].filter((id) => !yourXiIds.has(id));
  const yoursOnly = [...yourXiIds].filter((id) => !theirXiIds.has(id));

  const yourCaptain = yourPicks.picks.find((p) => p.is_captain)?.element ?? null;
  const theirCaptain = theirPicks.picks.find((p) => p.is_captain)?.element ?? null;

  return {
    theirsOnly,
    yoursOnly,
    captaincyDiff: {
      yours: yourCaptain,
      theirs: theirCaptain,
      same: yourCaptain !== null && yourCaptain === theirCaptain,
    },
  };
}
