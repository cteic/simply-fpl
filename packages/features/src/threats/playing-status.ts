import type { FplFixture } from '@simplyfpl/types';

export type ThreatPlayingStatus = 'playing' | 'to-play' | 'played' | 'didnt-play';

interface DerivePlayingStatusArgs {
  teamId: number;
  fixtures: FplFixture[];
  minutes: number;
  nowMs: number;
}

function isFinished(fixture: FplFixture): boolean {
  return fixture.finished || fixture.finished_provisional === true;
}

function hasKickedOff(fixture: FplFixture, nowMs: number): boolean {
  if (fixture.kickoff_time === null) return false;
  const kickoff = Date.parse(fixture.kickoff_time);
  if (Number.isNaN(kickoff)) return false;
  return kickoff <= nowMs;
}

export function derivePlayingStatus({
  teamId,
  fixtures,
  minutes,
  nowMs,
}: DerivePlayingStatusArgs): ThreatPlayingStatus {
  const relevant = fixtures.filter((f) => f.team_h === teamId || f.team_a === teamId);
  if (relevant.length === 0) return 'to-play';

  if (relevant.some((f) => !isFinished(f) && hasKickedOff(f, nowMs))) return 'playing';
  if (relevant.some((f) => !isFinished(f) && !hasKickedOff(f, nowMs))) return 'to-play';

  return minutes > 0 ? 'played' : 'didnt-play';
}
