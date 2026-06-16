export interface FplPassthroughTarget {
  upstreamUrl: string;
  cacheKey: string;
}

interface FplRouteRule {
  pattern: RegExp;
  allowedParams: ReadonlyArray<string>;
}

const FPL_ROUTE_RULES: ReadonlyArray<FplRouteRule> = [
  { pattern: /^\/bootstrap-static\/$/, allowedParams: [] },
  { pattern: /^\/event\/\d+\/live\/$/, allowedParams: [] },
  { pattern: /^\/leagues-classic\/\d+\/standings\/$/, allowedParams: ['page_standings'] },
  { pattern: /^\/entry\/\d+\/event\/\d+\/picks\/$/, allowedParams: [] },
  { pattern: /^\/entry\/\d+\/transfers\/$/, allowedParams: [] },
  { pattern: /^\/entry\/\d+\/history\/$/, allowedParams: [] },
  { pattern: /^\/entry\/\d+\/$/, allowedParams: [] },
  { pattern: /^\/fixtures\/$/, allowedParams: ['event'] },
  { pattern: /^\/element-summary\/\d+\/$/, allowedParams: [] },
  { pattern: /^\/me\/$/, allowedParams: [] },
];

export function matchFplRoute(pathname: string): FplRouteRule | null {
  for (const rule of FPL_ROUTE_RULES) {
    if (rule.pattern.test(pathname)) return rule;
  }
  return null;
}

export function buildFplPassthroughTarget(
  fplOrigin: string,
  pathname: string,
  search: string
): FplPassthroughTarget {
  const rule = matchFplRoute(pathname);
  if (!rule) {
    throw new Error(`FPL path not in allow-list: ${pathname}`);
  }
  const params = new URLSearchParams(search);
  const normalised = new URLSearchParams();
  for (const key of rule.allowedParams) {
    const val = params.get(key);
    if (val !== null) normalised.set(key, val);
  }
  const normSearch = normalised.size > 0 ? `?${normalised.toString()}` : '';
  return {
    upstreamUrl: `${fplOrigin}${pathname}${normSearch}`,
    cacheKey: `fpl:${pathname}${normSearch}`,
  };
}
