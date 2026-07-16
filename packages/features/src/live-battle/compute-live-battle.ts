import { predictBonusPoints } from '@simplyfpl/fpl-client';
import type { BonusPrediction } from '@simplyfpl/fpl-client';
import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplEntryPick,
  FplFixture,
  FplLiveGameweek,
  FplPlayer,
} from '@simplyfpl/types';

export type LiveBattlePosition = 'gk' | 'def' | 'mid' | 'fwd';

const POSITION_FROM_ELEMENT_TYPE: Record<number, LiveBattlePosition> = {
  1: 'gk',
  2: 'def',
  3: 'mid',
  4: 'fwd',
};

export interface LiveBattlePlayer {
  elementId: number;
  name: string;
  teamShort: string;
  teamCode: number;
  position: LiveBattlePosition;
  owned: boolean;
  isCaptain: boolean;
  /** Your stake in this player: 0 (not in your active XI), 1, 2 (captain), 3 (triple captain). */
  userMultiplier: number;
  /** The field's effective ownership as a percentage (0..~150 with captaincy). */
  fieldOwnershipPct: number;
  /** Live points incl. provisional bonus, before any captain multiplier. */
  livePoints: number;
  /** Signed net points vs the field — positive pushes your rank up, negative down. */
  rankImpact: number;
}

export interface LiveBattle {
  /** True when at least one fixture is currently in progress. */
  isLive: boolean;
  gains: LiveBattlePlayer[];
  losses: LiveBattlePlayer[];
  /** Sum of every live player's rankImpact: your net live points vs the average field manager. */
  totalImpact: number;
}

/** elementId -> the field's effective ownership as a percentage. */
export type FieldOwnershipSource = Map<number, number>;

export interface ComputeLiveBattleArgs {
  yourPicks: FplEntryGameweekPicks;
  bootstrap: FplBootstrapStatic;
  liveGw: FplLiveGameweek;
  fixtures: FplFixture[];
  /**
   * Field effective-ownership source as percentages. Defaults to bootstrap
   * `selected_by_percent` (overall ownership) — swap in a top-10k cohort map
   * here once cohort accuracy lands, without touching the calc.
   */
  fieldOwnership?: FieldOwnershipSource;
  /** Precomputed provisional-bonus map; derived from fixtures + liveGw if omitted. */
  bonusMap?: Map<number, BonusPrediction>;
}

/**
 * Build a field effective-ownership map (percent) from bootstrap overall
 * ownership (`selected_by_percent`). This is the always-available v1 baseline;
 * a cohort/top-10k map can be supplied to `computeLiveBattle` instead.
 */
export function fieldOwnershipFromBootstrap(bootstrap: FplBootstrapStatic): FieldOwnershipSource {
  const map = new Map<number, number>();
  for (const player of bootstrap.elements) {
    const pct = Number.parseFloat(player.selected_by_percent);
    map.set(player.id, Number.isFinite(pct) ? pct : 0);
  }
  return map;
}

function teamsInLiveFixtures(fixtures: FplFixture[]): Set<number> {
  const teams = new Set<number>();
  for (const fixture of fixtures) {
    const inProgress =
      fixture.started === true &&
      fixture.finished !== true &&
      fixture.finished_provisional !== true;
    if (!inProgress) continue;
    teams.add(fixture.team_h);
    teams.add(fixture.team_a);
  }
  return teams;
}

/**
 * "Live Battle" — the players in currently-playing fixtures who are moving your
 * overall rank right now, split into gains and losses.
 *
 * Per-player heuristic (transparent, signed, testable — not a livefpl clone):
 *
 *     rankImpact = livePoints * (userMultiplier - fieldOwnershipFraction)
 *
 * where `userMultiplier` is your stake in the player (0 if not in your active
 * XI, 1 starter, 2 captain, 3 triple captain) and `fieldOwnershipFraction` is
 * the field's effective ownership as a 0..1+ fraction. Owned + low-ownership +
 * high-scoring yields a large positive gain; unowned + high-ownership +
 * high-scoring yields a large negative loss. Summed over every live player the
 * total equals your live points from currently-playing fixtures minus the
 * average field manager's — i.e. your net points vs the field.
 *
 * Only players whose fixture is in progress are considered, and players with no
 * live contribution (rankImpact 0) are dropped.
 */
export function computeLiveBattle({
  yourPicks,
  bootstrap,
  liveGw,
  fixtures,
  fieldOwnership,
  bonusMap,
}: ComputeLiveBattleArgs): LiveBattle {
  const liveTeams = teamsInLiveFixtures(fixtures);
  if (liveTeams.size === 0) {
    return { isLive: false, gains: [], losses: [], totalImpact: 0 };
  }

  const playersById = new Map<number, FplPlayer>();
  for (const player of bootstrap.elements) playersById.set(player.id, player);

  const teamById = new Map<number, { shortName: string; code: number }>();
  for (const team of bootstrap.teams) {
    teamById.set(team.id, { shortName: team.short_name, code: team.code });
  }

  const field = fieldOwnership ?? fieldOwnershipFromBootstrap(bootstrap);
  const bonus = bonusMap ?? predictBonusPoints(liveGw, fixtures, bootstrap);

  const isBenchBoost = yourPicks.active_chip === 'bboost';
  const isTripleCaptain = yourPicks.active_chip === '3xc';
  const pickByElement = new Map<number, FplEntryPick>();
  for (const pick of yourPicks.picks) pickByElement.set(pick.element, pick);

  const players: LiveBattlePlayer[] = [];

  for (const liveEl of liveGw.elements) {
    const player = playersById.get(liveEl.id);
    if (!player) continue;
    if (!liveTeams.has(player.team)) continue;

    const bonusInfo = bonus.get(liveEl.id);
    const provisionalBonus = bonusInfo && bonusInfo.provisional ? bonusInfo.bonus : 0;
    const livePoints = liveEl.stats.total_points + provisionalBonus;

    const pick = pickByElement.get(liveEl.id);
    const owned = pick !== undefined;
    const active = pick !== undefined && (pick.position <= 11 || isBenchBoost);
    let userMultiplier = 0;
    if (active && pick !== undefined) {
      if (pick.is_captain) userMultiplier = isTripleCaptain ? 3 : 2;
      else userMultiplier = 1;
    }

    const fieldOwnershipPct = field.get(liveEl.id) ?? 0;
    const fieldFraction = fieldOwnershipPct / 100;
    const rankImpact = livePoints * (userMultiplier - fieldFraction);
    if (rankImpact === 0) continue;

    const team = teamById.get(player.team);

    players.push({
      elementId: liveEl.id,
      name: player.web_name,
      teamShort: team?.shortName ?? '',
      teamCode: team?.code ?? 0,
      position: POSITION_FROM_ELEMENT_TYPE[player.element_type] ?? 'mid',
      owned,
      isCaptain: pick?.is_captain ?? false,
      userMultiplier,
      fieldOwnershipPct,
      livePoints,
      rankImpact,
    });
  }

  const gains = players.filter((p) => p.rankImpact > 0).sort((a, b) => b.rankImpact - a.rankImpact);
  const losses = players
    .filter((p) => p.rankImpact < 0)
    .sort((a, b) => a.rankImpact - b.rankImpact);
  const totalImpact = players.reduce((sum, p) => sum + p.rankImpact, 0);

  return { isLive: true, gains, losses, totalImpact };
}
