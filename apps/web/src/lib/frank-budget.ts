/**
 * The daily token budget for Frank, enforced in Postgres by one statement.
 *
 * See supabase/migrations/0011_frank_daily_budget.sql for why this cannot be a
 * read followed by a write.
 */

/**
 * Tokens reserved per question before the model is called: about 4,000 of
 * context, the question, and the 1,536-token output ceiling. Deliberately on
 * the high side. An estimate that is too low lets the last few requests of the
 * day overshoot the cap; one that is too high only ends the day slightly early,
 * and the difference is handed back when the real usage is known.
 */
export const FRANK_RESERVE_TOKENS = 6000;

/**
 * Tokens Frank may spend in a UTC day when FRANK_DAILY_SPEND_CAP_TOKENS is not
 * set. There used to be no cap at all without that variable. Five million
 * tokens is roughly 800 questions and, at Haiku 5.5 prices, a few dollars at
 * the very worst.
 */
export const FRANK_DEFAULT_DAILY_CAP_TOKENS = 5_000_000;

export type BudgetOutcome =
  /** Tokens are held for this request. */
  | 'reserved'
  /** The day's budget cannot cover this request. */
  | 'over-cap'
  /** The budget function could not be reached: not migrated yet, or an error. */
  | 'unavailable';

interface StoreResult {
  data: unknown;
  error: unknown;
}

/**
 * The two database calls the budget needs. The route supplies them as closures
 * over its Supabase client, which keeps this module free of the client's types
 * and lets the tests stand in a counter with the same semantics.
 */
export interface BudgetStore {
  reserve(tokens: number, cap: number): PromiseLike<StoreResult>;
  settle(delta: number): PromiseLike<StoreResult>;
}

export function resolveDailyCap(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return FRANK_DEFAULT_DAILY_CAP_TOKENS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FRANK_DEFAULT_DAILY_CAP_TOKENS;
}

/**
 * Try to hold `tokens` out of today's budget.
 *
 * `unavailable` is distinct from `over-cap` on purpose. It means the function
 * is missing or the database errored, and the caller decides what to do: the
 * route falls back to its old check, so deploying the code before the
 * migration does not take Frank down.
 */
export async function reserveDailyTokens(
  store: BudgetStore,
  tokens: number,
  cap: number
): Promise<BudgetOutcome> {
  try {
    const { data, error } = await store.reserve(tokens, cap);
    if (error) return 'unavailable';
    if (data === true) return 'reserved';
    if (data === false) return 'over-cap';
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/**
 * Replace a reservation with what was actually spent. Pass 0 for `actual` to
 * release a reservation whose request never reached the model. Best-effort: a
 * failed settle leaves the estimate in place, which errs towards spending less.
 */
export async function settleDailyTokens(
  store: BudgetStore,
  reserved: number,
  actual: number
): Promise<void> {
  const delta = Math.round(actual - reserved);
  if (delta === 0) return;
  try {
    await store.settle(delta);
  } catch {
    // best-effort
  }
}
