import type { FplFixture } from '@simplyfpl/types';

export function buildSlimFixtures(fixtures: FplFixture[]): FplFixture[] {
  return fixtures.map((f) => {
    const slim: FplFixture = {
      id: f.id,
      event: f.event,
      finished: f.finished,
      kickoff_time: f.kickoff_time,
      team_h: f.team_h,
      team_a: f.team_a,
      team_h_score: f.team_h_score,
      team_a_score: f.team_a_score,
      team_h_difficulty: f.team_h_difficulty,
      team_a_difficulty: f.team_a_difficulty,
    };
    if (f.started !== undefined) slim.started = f.started;
    if (f.finished_provisional !== undefined) slim.finished_provisional = f.finished_provisional;
    return slim;
  });
}
