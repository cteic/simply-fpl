import type { FplEvent, FplFixture } from '@simplyfpl/types';

export const CADENCE_MATCH_MS = 5_000;
export const CADENCE_PRE_MATCH_MS = 120_000;
export const CADENCE_BONUS_SETTLING_MS = 30_000;
export const CADENCE_GW_LIVE_NO_MATCH_MS = 120_000;
export const CADENCE_IDLE_MS = 300_000;

const MATCH_DURATION_MS = 120 * 60 * 1000;
const PRE_MATCH_WINDOW_MS = 30 * 60 * 1000;
const POST_MATCH_BONUS_WINDOW_MS = 2 * 60 * 60 * 1000;
const DEADLINE_NEAR_WINDOW_MS = 60 * 60 * 1000;

function findCurrentEvent(events: FplEvent[]): FplEvent | undefined {
  return events.find((e) => e.is_current);
}

function fixturesForEvent(eventId: number, fixtures: FplFixture[]): FplFixture[] {
  return fixtures.filter((f) => f.event === eventId);
}

function isMatchInProgress(now: number, fixture: FplFixture): boolean {
  if (fixture.finished) return false;
  if (!fixture.kickoff_time) return false;
  const kickoff = Date.parse(fixture.kickoff_time);
  if (Number.isNaN(kickoff)) return false;
  return now >= kickoff && now <= kickoff + MATCH_DURATION_MS;
}

function isPreMatch(now: number, fixture: FplFixture): boolean {
  if (fixture.finished) return false;
  if (!fixture.kickoff_time) return false;
  const kickoff = Date.parse(fixture.kickoff_time);
  if (Number.isNaN(kickoff)) return false;
  const delta = kickoff - now;
  return delta > 0 && delta <= PRE_MATCH_WINDOW_MS;
}

function lastFinishedKickoff(fixtures: FplFixture[]): number | null {
  let latest: number | null = null;
  for (const f of fixtures) {
    if (!f.kickoff_time) continue;
    const kickoff = Date.parse(f.kickoff_time);
    if (Number.isNaN(kickoff)) continue;
    if (latest === null || kickoff > latest) latest = kickoff;
  }
  return latest;
}

export function pickCadenceMs(
  now: Date,
  events: FplEvent[],
  fixtures: FplFixture[]
): number | null {
  const currentEvent = findCurrentEvent(events);
  if (!currentEvent) return CADENCE_IDLE_MS;

  if (currentEvent.finished) return null;

  const nowMs = now.getTime();
  const eventFixtures = fixturesForEvent(currentEvent.id, fixtures);
  const deadlineMs = Date.parse(currentEvent.deadline_time);
  const deadlineKnown = !Number.isNaN(deadlineMs);

  if (eventFixtures.some((f) => isMatchInProgress(nowMs, f))) return CADENCE_MATCH_MS;
  if (eventFixtures.some((f) => isPreMatch(nowMs, f))) return CADENCE_PRE_MATCH_MS;

  const allFinished = eventFixtures.length > 0 && eventFixtures.every((f) => f.finished);
  if (allFinished) {
    const lastKickoff = lastFinishedKickoff(eventFixtures);
    if (lastKickoff !== null) {
      const fullTime = lastKickoff + MATCH_DURATION_MS;
      if (nowMs - fullTime <= POST_MATCH_BONUS_WINDOW_MS) {
        return CADENCE_BONUS_SETTLING_MS;
      }
    }
  }

  if (deadlineKnown && nowMs >= deadlineMs) return CADENCE_GW_LIVE_NO_MATCH_MS;

  if (deadlineKnown && deadlineMs - nowMs <= DEADLINE_NEAR_WINDOW_MS) {
    return CADENCE_PRE_MATCH_MS;
  }

  return CADENCE_IDLE_MS;
}

export function isGameweekFinishedAndBonusLocked(
  events: FplEvent[],
  fixtures: FplFixture[]
): boolean {
  const currentEvent = findCurrentEvent(events);
  if (!currentEvent) return false;
  if (!currentEvent.finished) return false;
  const eventFixtures = fixturesForEvent(currentEvent.id, fixtures);
  if (eventFixtures.length === 0) return true;
  return eventFixtures.every((f) => f.finished);
}
