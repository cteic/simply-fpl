import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplLiveGameweek,
  LiveSquadEvent,
  LiveSquadEventKind,
} from '@simplyfpl/types';

const STARTING_XI_MAX_POSITION = 11;

export interface DiffLiveSquadEventsInput {
  /** The live feed as of the previous refresh. Undefined on first load. */
  previous: FplLiveGameweek | undefined;
  next: FplLiveGameweek;
  picks: FplEntryGameweekPicks;
  bootstrap: FplBootstrapStatic;
}

interface CountedStat {
  kind: LiveSquadEventKind;
  before: number;
  after: number;
}

/**
 * What changed for this manager's squad between two refreshes of the live feed.
 *
 * This is what drives the in-app alerts: a goal, an assist, bonus landing, a
 * card. It compares two snapshots rather than reading a list of events because
 * FPL publishes running totals, not a feed.
 *
 * With no previous snapshot it returns nothing. Opening the app mid-gameweek
 * must not replay every goal of the weekend as if it had just gone in.
 *
 * Totals can also go down: FPL revokes a clean sheet when a goal is conceded
 * and occasionally reassigns a goal or an assist. A lost clean sheet is its own
 * event because it costs points; other downward corrections are dropped, since
 * "a goal was taken away" with no context reads as a bug.
 */
export function diffLiveSquadEvents(input: DiffLiveSquadEventsInput): LiveSquadEvent[] {
  const { previous, next, picks, bootstrap } = input;
  if (!previous) return [];

  const before = new Map(previous.elements.map((e) => [e.id, e]));
  const after = new Map(next.elements.map((e) => [e.id, e]));
  const names = new Map(bootstrap.elements.map((p) => [p.id, p.web_name]));
  const benchBoost = picks.active_chip === 'bboost';
  const events: LiveSquadEvent[] = [];

  for (const pick of picks.picks) {
    const was = before.get(pick.element);
    const now = after.get(pick.element);
    if (!was || !now) continue;

    const onBench = !benchBoost && pick.position > STARTING_XI_MAX_POSITION;
    // A benched player scores nothing for the manager unless auto-subbed in,
    // which is not known until the gameweek ends, so their multiplier is 0.
    const multiplier = onBench ? 0 : pick.multiplier;
    const pointsDelta = (now.stats.total_points - was.stats.total_points) * multiplier;
    const playerName = names.get(pick.element) ?? `#${pick.element}`;

    const counted: CountedStat[] = [
      { kind: 'goal', before: was.stats.goals_scored, after: now.stats.goals_scored },
      { kind: 'assist', before: was.stats.assists, after: now.stats.assists },
      { kind: 'red_card', before: was.stats.red_cards, after: now.stats.red_cards },
      { kind: 'bonus', before: was.stats.bonus, after: now.stats.bonus },
    ];

    const kinds: LiveSquadEventKind[] = [];
    for (const stat of counted) {
      for (let n = stat.before; n < stat.after; n += 1) kinds.push(stat.kind);
    }
    if (was.stats.clean_sheets > now.stats.clean_sheets) kinds.push('clean_sheet_lost');

    kinds.forEach((kind, index) => {
      events.push({
        id: `${pick.element}:${kind}:${now.stats.total_points}:${index}`,
        kind,
        elementId: pick.element,
        playerName,
        isCaptain: pick.is_captain,
        onBench,
        // The points swing belongs to the player's refresh as a whole, so it
        // rides on their first event and later ones in the same refresh carry
        // zero. Otherwise a goal and its bonus would each claim the full gain.
        pointsDelta: index === 0 ? pointsDelta : 0,
      });
    });
  }

  // Starters before bench, biggest swing first.
  return events.sort((a, b) => {
    if (a.onBench !== b.onBench) return a.onBench ? 1 : -1;
    return Math.abs(b.pointsDelta) - Math.abs(a.pointsDelta);
  });
}
