import type { FplEntryHistory, SeasonArrow, SeasonStory, SeasonStoryPoint } from '@simplyfpl/types';

function arrowFor(previousRank: number | null, rank: number): SeasonArrow {
  if (previousRank === null || previousRank === rank) return 'flat';
  return rank < previousRank ? 'green' : 'red';
}

/**
 * A manager's season so far, from FPL's own gameweek history.
 *
 * Everything here is settled fact rather than an estimate: the rank after each
 * gameweek, which way it moved, and the runs and records that fall out of it.
 * Gameweeks with no usable overall rank are skipped, which covers a manager
 * who joined late.
 */
export function buildSeasonStory(history: FplEntryHistory): SeasonStory {
  const rows = (Array.isArray(history.current) ? history.current : [])
    .filter((row) => Number.isFinite(row.overall_rank) && row.overall_rank > 0)
    .slice()
    .sort((a, b) => a.event - b.event);

  const trajectory: SeasonStoryPoint[] = [];
  let previousRank: number | null = null;
  let greenArrows = 0;
  let redArrows = 0;
  let benchPoints = 0;
  let hitPoints = 0;
  let bestRank: SeasonStory['bestRank'] = null;
  let bestGameweek: SeasonStory['bestGameweek'] = null;

  for (const row of rows) {
    const arrow = arrowFor(previousRank, row.overall_rank);
    if (arrow === 'green') greenArrows += 1;
    if (arrow === 'red') redArrows += 1;
    benchPoints += row.points_on_bench;
    hitPoints += row.event_transfers_cost;
    if (bestRank === null || row.overall_rank < bestRank.rank) {
      bestRank = { gw: row.event, rank: row.overall_rank };
    }
    if (bestGameweek === null || row.points > bestGameweek.points) {
      bestGameweek = { gw: row.event, points: row.points, gwRank: row.rank };
    }
    trajectory.push({ gw: row.event, rank: row.overall_rank, points: row.points, arrow });
    previousRank = row.overall_rank;
  }

  // The current run: consecutive arrows of the same colour, counted back from
  // the latest gameweek. A flat gameweek ends a run.
  let streakDirection: SeasonStory['streak']['direction'] = 'none';
  let streakLength = 0;
  for (let i = trajectory.length - 1; i >= 0; i -= 1) {
    const point = trajectory[i];
    if (!point || point.arrow === 'flat') break;
    if (streakDirection === 'none') streakDirection = point.arrow;
    if (point.arrow !== streakDirection) break;
    streakLength += 1;
  }

  return {
    trajectory,
    bestRank,
    bestGameweek,
    greenArrows,
    redArrows,
    streak: { direction: streakDirection, length: streakLength },
    benchPoints,
    hitPoints,
  };
}

export interface SparklineBox {
  width: number;
  height: number;
  /** Space kept clear top and bottom so the stroke is not clipped. */
  padding?: number;
}

/**
 * The trajectory as an SVG polyline `points` string, best rank at the top.
 *
 * Rank is plotted on a log scale. On a linear one a climb from 4,000,000 to
 * 2,000,000 would dwarf a climb from 20,000 to 10,000, though both halve the
 * rank and the second is much the harder.
 *
 * Returns null with fewer than two gameweeks: one point is not a line, and
 * drawing a made-up one would be worse than drawing nothing.
 */
export function seasonSparklinePoints(
  trajectory: SeasonStoryPoint[],
  box: SparklineBox
): string | null {
  if (trajectory.length < 2) return null;
  const padding = box.padding ?? 4;
  const logs = trajectory.map((point) => Math.log10(point.rank));
  const min = Math.min(...logs);
  const max = Math.max(...logs);
  const span = max - min;
  const usable = box.height - padding * 2;
  const step = box.width / (trajectory.length - 1);

  return logs
    .map((value, index) => {
      const fraction = span === 0 ? 0.5 : (value - min) / span;
      const x = Math.round(index * step * 10) / 10;
      const y = Math.round((padding + fraction * usable) * 10) / 10;
      return `${x},${y}`;
    })
    .join(' ');
}
