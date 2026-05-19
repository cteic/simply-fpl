import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplEntryPick,
  FplLiveGameweek,
} from '@simplyfpl/types';

const POSITION_GK = 1;
const POSITION_DEF = 2;
const POSITION_MID = 3;
const POSITION_FWD = 4;

interface FormationCounts {
  gk: number;
  def: number;
  mid: number;
  fwd: number;
}

function elementTypeOf(elementId: number, bootstrap: FplBootstrapStatic): number | null {
  const player = bootstrap.elements.find((e) => e.id === elementId);
  return player ? player.element_type : null;
}

function formationFromPicks(picks: FplEntryPick[], bootstrap: FplBootstrapStatic): FormationCounts {
  const counts: FormationCounts = { gk: 0, def: 0, mid: 0, fwd: 0 };
  for (const pick of picks.filter((p) => p.position <= 11)) {
    const type = elementTypeOf(pick.element, bootstrap);
    if (type === POSITION_GK) counts.gk += 1;
    else if (type === POSITION_DEF) counts.def += 1;
    else if (type === POSITION_MID) counts.mid += 1;
    else if (type === POSITION_FWD) counts.fwd += 1;
  }
  return counts;
}

function isValidFormation(counts: FormationCounts): boolean {
  if (counts.gk !== 1) return false;
  if (counts.def < 3 || counts.def > 5) return false;
  if (counts.mid < 2 || counts.mid > 5) return false;
  if (counts.fwd < 1 || counts.fwd > 3) return false;
  return counts.gk + counts.def + counts.mid + counts.fwd === 11;
}

/**
 * Apply standard FPL autosub rules to a set of picks.
 *
 * Rules implemented:
 * - Bench Boost active: no autosubs (all 15 already count).
 * - For each starter (positions 1-11) whose live minutes are 0, look for the
 *   highest-priority bench player (positions 12 → 15 in order) who has played
 *   minutes > 0 and would leave the resulting XI in a legal formation
 *   (1 GK, 3-5 DEF, 2-5 MID, 1-3 FWD).
 * - The starting GK can only be replaced by the bench GK (position 12 in FPL).
 *
 * Returns a new `FplEntryGameweekPicks` with positions and multipliers swapped
 * for any autosubs applied. Captain promotion (vice → captain when captain
 * played 0 min) is out of scope for this dress-rehearsal pass.
 */
export function applyAutosubs(
  picks: FplEntryGameweekPicks,
  liveData: FplLiveGameweek,
  bootstrap: FplBootstrapStatic
): FplEntryGameweekPicks {
  if (picks.active_chip === 'bboost') return picks;

  const liveMap = new Map(liveData.elements.map((e) => [e.id, e]));
  let workingPicks: FplEntryPick[] = picks.picks.map((p) => ({ ...p }));
  const usedBench = new Set<number>();

  const starters = [...workingPicks.filter((p) => p.position <= 11)].sort(
    (a, b) => a.position - b.position
  );

  for (const starter of starters) {
    const live = liveMap.get(starter.element);
    if (live && live.stats.minutes > 0) continue;

    const starterType = elementTypeOf(starter.element, bootstrap);
    if (starterType === null) continue;

    const benchCandidates = workingPicks
      .filter((p) => p.position > 11 && !usedBench.has(p.element))
      .sort((a, b) => a.position - b.position);

    let chosen: FplEntryPick | null = null;
    for (const candidate of benchCandidates) {
      const candLive = liveMap.get(candidate.element);
      if (!candLive || candLive.stats.minutes <= 0) continue;

      const candType = elementTypeOf(candidate.element, bootstrap);
      if (candType === null) continue;

      // GK can only be replaced by GK and vice versa.
      if ((starterType === POSITION_GK) !== (candType === POSITION_GK)) continue;

      const simulated = workingPicks.map((p) => {
        if (p.element === starter.element) return { ...p, position: candidate.position };
        if (p.element === candidate.element) return { ...p, position: starter.position };
        return p;
      });
      if (!isValidFormation(formationFromPicks(simulated, bootstrap))) continue;

      chosen = candidate;
      break;
    }

    if (!chosen) continue;

    const replacement = chosen;
    const swappedStarterPos = replacement.position;
    const swappedStarterMult = 0;
    const swappedBenchPos = starter.position;
    const swappedBenchMult = starter.multiplier;
    workingPicks = workingPicks.map((p) => {
      if (p.element === starter.element) {
        return { ...p, position: swappedStarterPos, multiplier: swappedStarterMult };
      }
      if (p.element === replacement.element) {
        return { ...p, position: swappedBenchPos, multiplier: swappedBenchMult };
      }
      return p;
    });
    usedBench.add(replacement.element);
  }

  return { ...picks, picks: workingPicks };
}
