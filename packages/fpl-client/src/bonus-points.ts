import type {
  FplBootstrapStatic,
  FplFixture,
  FplLiveElement,
  FplLiveGameweek,
} from '@simplyfpl/types';

export interface BonusPrediction {
  bonus: number;
  provisional: boolean;
}

/**
 * Predict bonus points per element from current BPS values.
 *
 * For fixtures that are not yet finished (`finished` and `finished_provisional`
 * both falsy), the top-3 BPS values in each fixture get 3 / 2 / 1 predicted
 * bonus points respectively, with players tied on BPS sharing the same tier.
 *
 * For finished fixtures the official `stats.bonus` is returned with
 * `provisional: false` so callers can avoid double-counting (the official
 * bonus is already included in `stats.total_points` once FPL finalises it).
 */
export function predictBonusPoints(
  liveData: FplLiveGameweek,
  fixtures: FplFixture[],
  _bootstrap: FplBootstrapStatic
): Map<number, BonusPrediction> {
  const result = new Map<number, BonusPrediction>();
  const fixturesById = new Map(fixtures.map((f) => [f.id, f]));

  const fixtureToElements = new Map<number, FplLiveElement[]>();
  for (const el of liveData.elements) {
    if (!el.explain || el.explain.length === 0) continue;
    const seen = new Set<number>();
    for (const explain of el.explain) {
      if (seen.has(explain.fixture)) continue;
      seen.add(explain.fixture);
      const arr = fixtureToElements.get(explain.fixture) ?? [];
      arr.push(el);
      fixtureToElements.set(explain.fixture, arr);
    }
  }

  for (const [fixtureId, els] of fixtureToElements) {
    const fixture = fixturesById.get(fixtureId);
    if (!fixture) continue;

    if (fixture.finished) {
      for (const el of els) {
        const existing = result.get(el.id);
        const total = (existing?.bonus ?? 0) + el.stats.bonus;
        result.set(el.id, { bonus: total, provisional: false });
      }
      continue;
    }

    if (fixture.finished_provisional === true) {
      for (const el of els) {
        if (el.stats.bonus <= 0) continue;
        const existing = result.get(el.id);
        const total = (existing?.bonus ?? 0) + el.stats.bonus;
        result.set(el.id, { bonus: total, provisional: true });
      }
      continue;
    }

    const withBps = els.filter((e) => e.stats.bps > 0).sort((a, b) => b.stats.bps - a.stats.bps);
    if (withBps.length === 0) continue;

    // FPL ranks by position, not by distinct BPS value: a tie for first gives 3, 3, 1 and a tie
    // for second gives 3, 2, 2. A player's place is one more than the number ahead of them.
    const BONUS_BY_PLACE = [3, 2, 1];
    const tierBonus = new Map<number, number>();
    for (const el of withBps) {
      if (tierBonus.has(el.stats.bps)) continue;
      const ahead = withBps.filter((other) => other.stats.bps > el.stats.bps).length;
      tierBonus.set(el.stats.bps, BONUS_BY_PLACE[ahead] ?? 0);
    }

    for (const el of withBps) {
      const bonus = tierBonus.get(el.stats.bps) ?? 0;
      if (bonus === 0) continue;
      const existing = result.get(el.id);
      const prevBonus = existing?.bonus ?? 0;
      result.set(el.id, { bonus: prevBonus + bonus, provisional: true });
    }
  }

  return result;
}
