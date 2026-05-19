import type {
  FplBootstrapStatic,
  FplElementType,
  FplEntry,
  FplEntryGameweekPicks,
  FplEntrySnapshot,
  FplEvent,
  FplPlayer,
  FplTeam,
} from '@simplyfpl/types';

export interface SnapshotEnv {
  FPL_CACHE: KVNamespace;
  FPL_BASE_URL: string;
}

export interface SnapshotResult {
  status: number;
  body: FplEntrySnapshot | { error: string };
}

class UpstreamError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string
  ) {
    super(`upstream ${status}: ${url}`);
  }
}

async function getCachedJson<T>(
  env: SnapshotEnv,
  ctx: ExecutionContext,
  cacheKey: string,
  upstreamUrl: string,
  ttl: number
): Promise<T> {
  const cached = await env.FPL_CACHE.get(cacheKey, 'text');
  if (cached !== null) {
    return JSON.parse(cached) as T;
  }
  const upstream = await fetch(upstreamUrl, {
    headers: { 'User-Agent': 'SimplyFPL/1.0', Accept: 'application/json' },
  });
  if (!upstream.ok) {
    throw new UpstreamError(upstream.status, upstreamUrl);
  }
  const text = await upstream.text();
  ctx.waitUntil(env.FPL_CACHE.put(cacheKey, text, { expirationTtl: ttl }).catch(() => undefined));
  return JSON.parse(text) as T;
}

export function currentGwFromBootstrap(bootstrap: FplBootstrapStatic): number {
  const current = bootstrap.events.find((e) => e.is_current);
  if (current) return current.id;
  const next = bootstrap.events.find((e) => e.is_next);
  if (next) return next.id;
  return bootstrap.events.at(-1)?.id ?? 1;
}

function projectPlayer(p: FplPlayer): FplPlayer {
  return {
    id: p.id,
    web_name: p.web_name,
    first_name: '',
    second_name: '',
    team: p.team,
    element_type: p.element_type,
    now_cost: p.now_cost,
    total_points: 0,
    event_points: 0,
    selected_by_percent: p.selected_by_percent,
    transfers_in_event: 0,
    transfers_out_event: 0,
    chance_of_playing_next_round: null,
    news: '',
  };
}

function projectTeam(t: FplTeam): FplTeam {
  return { id: t.id, name: '', short_name: t.short_name, code: t.code };
}

function projectEvent(e: FplEvent): FplEvent {
  return {
    id: e.id,
    name: '',
    deadline_time: '',
    is_current: e.is_current,
    is_next: e.is_next,
    is_previous: e.is_previous,
    average_entry_score: e.average_entry_score,
    highest_score: null,
    finished: e.finished,
  };
}

function projectElementType(et: FplElementType): FplElementType {
  return {
    id: et.id,
    plural_name: '',
    plural_name_short: '',
    singular_name: '',
    singular_name_short: '',
  };
}

export function buildBootstrapLite(
  bootstrap: FplBootstrapStatic,
  gw: number,
  pickElementIds: readonly number[]
): FplBootstrapStatic {
  const wanted = new Set(pickElementIds);
  const elements = wanted.size
    ? bootstrap.elements.filter((p) => wanted.has(p.id)).map(projectPlayer)
    : [];
  const teams = bootstrap.teams.map(projectTeam);
  const currentEvent = bootstrap.events.find((e) => e.id === gw);
  const events = currentEvent ? [projectEvent(currentEvent)] : [];
  const element_types = bootstrap.element_types.map(projectElementType);
  return { elements, teams, events, element_types };
}

export async function handleEntrySnapshot(
  env: SnapshotEnv,
  ctx: ExecutionContext,
  entryId: number
): Promise<SnapshotResult> {
  let bootstrap: FplBootstrapStatic;
  try {
    bootstrap = await getCachedJson<FplBootstrapStatic>(
      env,
      ctx,
      'fpl:/bootstrap-static/',
      `${env.FPL_BASE_URL}/bootstrap-static/`,
      3600
    );
  } catch {
    return { status: 502, body: { error: 'bootstrap fetch failed' } };
  }
  const gw = currentGwFromBootstrap(bootstrap);

  const [entryResult, picksResult] = await Promise.allSettled([
    getCachedJson<FplEntry>(
      env,
      ctx,
      `fpl:/entry/${entryId}/`,
      `${env.FPL_BASE_URL}/entry/${entryId}/`,
      300
    ),
    getCachedJson<FplEntryGameweekPicks>(
      env,
      ctx,
      `fpl:/entry/${entryId}/event/${gw}/picks/`,
      `${env.FPL_BASE_URL}/entry/${entryId}/event/${gw}/picks/`,
      120
    ),
  ]);

  if (entryResult.status === 'rejected') {
    return { status: 404, body: { error: 'entry not found' } };
  }

  const picks = picksResult.status === 'fulfilled' ? picksResult.value : null;
  const pickIds = picks ? picks.picks.map((p) => p.element) : [];

  const liteKey = `lite:bootstrap:gw${gw}:${pickIds
    .slice()
    .sort((a, b) => a - b)
    .join(',')}`;
  const cachedLite = await env.FPL_CACHE.get<FplBootstrapStatic>(liteKey, 'json');
  let liteBootstrap: FplBootstrapStatic;
  if (cachedLite !== null) {
    liteBootstrap = cachedLite;
  } else {
    liteBootstrap = buildBootstrapLite(bootstrap, gw, pickIds);
    ctx.waitUntil(
      env.FPL_CACHE.put(liteKey, JSON.stringify(liteBootstrap), { expirationTtl: 300 }).catch(
        () => undefined
      )
    );
  }

  const body: FplEntrySnapshot = {
    bootstrap: liteBootstrap,
    entry: entryResult.value,
    picks,
    gw,
  };
  return { status: 200, body };
}
