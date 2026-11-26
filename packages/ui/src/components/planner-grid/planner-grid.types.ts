/**
 * Shared planner types.
 *
 * These live apart from the component because the native build resolves
 * `moduleSuffixes: ['.native', ...]`. If the native implementation imported
 * types from './planner-grid' it would resolve back to itself, so the
 * contract needs a module with no platform variant.
 */

export interface PlannerPlayer {
  name: string;
  form: 'good' | 'avg' | 'warning' | 'bad' | 'none';
  fdr: 1 | 2 | 3 | 4 | 5;
  /**
   * Opponent short name, e.g. "BHA (H)". Used by the native ticker layout,
   * which has room for the fixture rather than only the difficulty score.
   */
  opponent?: string;
  blank?: boolean;
  doubleGameweek?: boolean;
}

export interface PlannerGwCell {
  label: string;
  players: PlannerPlayer[];
}
