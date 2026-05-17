import type {
  FplBootstrapStatic,
  FplEntry,
  FplEntryGameweekPicks,
  FplEntrySnapshot,
  FplFixture,
  FplLeague,
  FplLiveGameweek,
} from '@simplyfpl/types';

// In production this points to your Cloudflare Worker
// In development it can proxy directly or use a local wrangler dev server
const DEFAULT_BASE_URL =
  process.env['NEXT_PUBLIC_API_URL'] ??
  process.env['EXPO_PUBLIC_API_URL'] ??
  'http://localhost:8787';

export interface FplClientConfig {
  baseUrl?: string;
}

export function createFplClient(config: FplClientConfig = {}) {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`);
    if (!res.ok) {
      throw new Error(`FPL API error: ${res.status} ${res.statusText} — ${path}`);
    }
    return res.json() as Promise<T>;
  }

  return {
    getBootstrapStatic(): Promise<FplBootstrapStatic> {
      return get<FplBootstrapStatic>('/fpl/bootstrap-static/');
    },

    getLiveGameweek(eventId: number): Promise<FplLiveGameweek> {
      return get<FplLiveGameweek>(`/fpl/event/${eventId}/live/`);
    },

    getEntry(entryId: number): Promise<FplEntry> {
      return get<FplEntry>(`/fpl/entry/${entryId}/`);
    },

    getEntryPicks(entryId: number, eventId: number): Promise<FplEntryGameweekPicks> {
      return get<FplEntryGameweekPicks>(`/fpl/entry/${entryId}/event/${eventId}/picks/`);
    },

    getEntrySnapshot(entryId: number): Promise<FplEntrySnapshot> {
      return get<FplEntrySnapshot>(`/snapshot/entry/${entryId}`);
    },

    getClassicLeague(leagueId: number, page = 1): Promise<FplLeague> {
      return get<FplLeague>(`/fpl/leagues-classic/${leagueId}/standings/?page_standings=${page}`);
    },

    getFixtures(eventId?: number): Promise<FplFixture[]> {
      const path = eventId ? `/fpl/fixtures/?event=${eventId}` : `/fpl/fixtures/`;
      return get<FplFixture[]>(path);
    },
  };
}

// Default singleton — apps can override baseUrl if needed
export const fplClient = createFplClient();
