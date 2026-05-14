/**
 * @simplyfpl/features
 *
 * React-aware business logic, hooks, and orchestration for SimplyFPL.
 * Platform-agnostic — MUST NOT import from `react-native`, `next`, or `expo`.
 *
 * For pure FPL API access and domain logic (rank, prices), use
 * `@simplyfpl/fpl-client`. This package layers React-aware concerns on top.
 *
 * Exposed via subpath imports for tree-shaking:
 *   import { computeLiveRank } from '@simplyfpl/features/live-rank';
 */

export * as liveRank from './live-rank';
export * as leagues from './leagues';
export * as planner from './planner';
export * as prices from './prices';
export * as auth from './auth';
export * as h2h from './h2h';
export * as rivals from './rivals';
export * as subscriptions from './subscriptions';
