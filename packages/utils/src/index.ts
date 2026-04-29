/**
 * Format a rank number with ordinal suffix
 */
export function formatRank(rank: number): string {
  if (rank <= 0) return '—';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = rank % 100;
  return rank + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
}

/**
 * Format rank movement for display
 * e.g. +12345, -500, —
 */
export function formatRankMovement(movement: number): string {
  if (movement === 0) return '—';
  return movement > 0 ? `↑${movement.toLocaleString()}` : `↓${Math.abs(movement).toLocaleString()}`;
}

/**
 * Format a deadline_time string to human-readable local time
 */
export function formatDeadline(isoString: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString));
}

/**
 * Returns true if we're in an active gameweek window
 * (between kickoff and ~3hrs after last fixture ends)
 */
export function isLiveGameweek(event: { is_current: boolean; finished: boolean }): boolean {
  return event.is_current && !event.finished;
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
