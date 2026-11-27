export type ThreatsEmptyState = 'no_team' | 'unavailable' | 'loading' | 'no_match';

export interface ThreatsEmptyStateArgs {
  hasEntry: boolean;
  /** True once the threats list has been computed. */
  resolved: boolean;
  /** True once the bootstrap has loaded, whether or not it names a gameweek. */
  bootstrapLoaded: boolean;
  gameweek: number | null;
  /** True when a request the list depends on has failed. */
  failed: boolean;
}

/**
 * Why the threats list is empty. "Loading" is only true while something is
 * still on its way: a failed request, or a bootstrap with no current gameweek,
 * will never resolve, and saying "loading" for those leaves the screen stuck.
 */
export function threatsEmptyState(args: ThreatsEmptyStateArgs): ThreatsEmptyState {
  if (!args.hasEntry) return 'no_team';
  if (args.resolved) return 'no_match';
  if (args.failed) return 'unavailable';
  if (args.bootstrapLoaded && args.gameweek === null) return 'unavailable';
  return 'loading';
}
