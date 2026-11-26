import type {
  FplBootstrapStatic,
  PlayerNewsStatus,
  ScoutEvent,
  ScoutEventKind,
  ScoutEventSeverity,
} from '@simplyfpl/types';

import { collateTeamNews, filterNewsForPicks } from './news';
import { predictPriceChanges } from './price-changes';

// Below this much progress toward FPL's threshold a price move is noise, not a
// report. Expressed in the same percent as `PriceChange.progressPercent`,
// where 100 means a change is due.
const DEFAULT_PRICE_PROGRESS_THRESHOLD = 50;

const AVAILABILITY_KIND: Partial<Record<PlayerNewsStatus, ScoutEventKind>> = {
  injured: 'injury',
  doubt: 'doubt',
  suspended: 'suspension',
  unavailable: 'unavailable',
};

const SEVERITY: Record<ScoutEventKind, ScoutEventSeverity> = {
  injury: 'bad',
  suspension: 'bad',
  unavailable: 'bad',
  doubt: 'warn',
  price_fall: 'warn',
  price_rise: 'good',
  suspension_risk: 'warn',
  ineligible: 'bad',
};

const SEVERITY_ORDER: Record<ScoutEventSeverity, number> = { bad: 0, warn: 1, good: 2 };

function urgency(event: ScoutEvent): number {
  if (event.probability !== null) return event.probability;
  return 1 - (event.chanceOfPlaying ?? 0) / 100;
}

export interface DeriveScoutEventsOptions {
  /** Percent of FPL's price-change threshold a player must have covered. */
  priceProgressThreshold?: number;
}

/**
 * Derives Frank's scout inbox from data the app already fetches: availability
 * news and predicted price moves, restricted to the manager's own picks.
 */
export function deriveScoutEvents(
  bootstrap: FplBootstrapStatic,
  pickIds: ReadonlySet<number>,
  options: DeriveScoutEventsOptions = {}
): ScoutEvent[] {
  const threshold = options.priceProgressThreshold ?? DEFAULT_PRICE_PROGRESS_THRESHOLD;
  const teamById = new Map(bootstrap.teams.map((t) => [t.id, t]));
  const playerById = new Map(bootstrap.elements.map((p) => [p.id, p]));

  const events: ScoutEvent[] = [];

  const newsItems = filterNewsForPicks(collateTeamNews(bootstrap), new Set(pickIds));
  for (const item of newsItems) {
    const kind = AVAILABILITY_KIND[item.status];
    if (!kind) continue;
    const player = playerById.get(item.id);
    const team = teamById.get(item.team_id);
    if (!player || !team) continue;
    events.push({
      id: `${kind}-${item.id}`,
      kind,
      severity: SEVERITY[kind],
      player: {
        id: player.id,
        webName: player.web_name,
        teamShortName: team.short_name,
        elementType: player.element_type,
        nowCost: player.now_cost,
      },
      news: item.news === '' ? null : item.news,
      chanceOfPlaying: item.chance_of_playing_next_round,
      probability: null,
      netTransfers: null,
    });
  }

  // Risks FPL flags itself. A suspension risk always matters: one booking and
  // the player misses a match. Ineligibility only matters for the gameweek
  // about to be picked for; one eleven gameweeks out is noise today.
  const nextGw = bootstrap.events.find((e) => e.is_next)?.id ?? null;
  for (const id of pickIds) {
    const player = playerById.get(id);
    if (!player || !Array.isArray(player.scout_risks)) continue;
    const team = teamById.get(player.team);
    if (!team) continue;
    for (const risk of player.scout_risks) {
      let kind: ScoutEventKind | null = null;
      if (risk.property === 'suspension_risk') kind = 'suspension_risk';
      else if (risk.property === 'loan_ineligible' && risk.gameweek === nextGw) kind = 'ineligible';
      if (kind === null) continue;
      events.push({
        id: `${kind}-${player.id}`,
        kind,
        severity: SEVERITY[kind],
        player: {
          id: player.id,
          webName: player.web_name,
          teamShortName: team.short_name,
          elementType: player.element_type,
          nowCost: player.now_cost,
        },
        news: risk.notes === '' ? null : risk.notes,
        chanceOfPlaying: null,
        probability: null,
        netTransfers: null,
      });
    }
  }

  for (const change of predictPriceChanges(bootstrap)) {
    if (change.direction === 'none') continue;
    if (!pickIds.has(change.player.id)) continue;
    if (change.progressPercent < threshold) continue;
    const kind: ScoutEventKind = change.direction === 'fall' ? 'price_fall' : 'price_rise';
    events.push({
      id: `${kind}-${change.player.id}`,
      kind,
      severity: SEVERITY[kind],
      player: {
        id: change.player.id,
        webName: change.player.web_name,
        teamShortName: change.team.short_name,
        elementType: change.player.element_type,
        nowCost: change.player.now_cost,
      },
      news: null,
      chanceOfPlaying: null,
      // How close the move is, not FPL's own confidence: that is the figure a
      // reader wants, and the one the inbox sorts on.
      probability: Math.min(1, change.progressPercent / 100),
      netTransfers: change.netTransfers,
    });
  }

  return events.sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return urgency(b) - urgency(a);
  });
}
