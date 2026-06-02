export interface FplPassthroughTarget {
  upstreamUrl: string;
  cacheKey: string;
}

export function buildFplPassthroughTarget(
  fplOrigin: string,
  pathname: string,
  search: string
): FplPassthroughTarget {
  return {
    upstreamUrl: `${fplOrigin}${pathname}${search}`,
    cacheKey: `fpl:${pathname}${search}`,
  };
}
