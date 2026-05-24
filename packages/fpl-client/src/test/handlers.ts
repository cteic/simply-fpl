import { HttpResponse, http } from 'msw';

import {
  bootstrapStatic,
  classicLeague,
  entry,
  entryPicks,
  fixtures,
  liveGameweek,
} from './fixtures';

const BASE = 'http://localhost:8787';

export const handlers = [
  http.get(`${BASE}/fpl/bootstrap-static-slim`, () => HttpResponse.json(bootstrapStatic)),
  http.get(`${BASE}/fpl/bootstrap-static/`, () => HttpResponse.json(bootstrapStatic)),
  http.get(`${BASE}/fpl/event/:eventId/live/`, () => HttpResponse.json(liveGameweek)),
  http.get(`${BASE}/fpl/entry/:entryId/`, () => HttpResponse.json(entry)),
  http.get(`${BASE}/fpl/entry/:entryId/event/:eventId/picks/`, () => HttpResponse.json(entryPicks)),
  http.get(`${BASE}/fpl/leagues/:leagueId/summary`, () => HttpResponse.json(classicLeague)),
  http.get(`${BASE}/fpl/leagues-classic/:leagueId/standings/`, () =>
    HttpResponse.json(classicLeague)
  ),
  http.get(`${BASE}/fpl/fixtures-slim`, ({ request }) => {
    const event = new URL(request.url).searchParams.get('event');
    if (event === null) return HttpResponse.json(fixtures);
    const filtered = fixtures.filter((f) => f.event === Number(event));
    return HttpResponse.json(filtered);
  }),
  http.get(`${BASE}/fpl/fixtures/`, () => HttpResponse.json(fixtures)),
];
