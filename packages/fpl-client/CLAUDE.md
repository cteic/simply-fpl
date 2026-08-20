# packages/fpl-client — pure FPL domain logic

The FPL API client plus live-rank and price-change algorithms. No React, and
nothing platform-specific.

## Rules

- Depends on `@simplyfpl/types` only. Adding any other workspace dependency is a
  design smell — raise it rather than working around it.
- No `react`, `react-native`, `next`, or `expo` imports. Pure TypeScript.
- Anything React-aware belongs one layer up in `packages/features`.
- FPL prices are in tenths (`55` = £5.5m). Format through `formatPrice()` rather
  than dividing at the call site.
- Bonus points are provisional until confirmed — model that explicitly, don't
  flatten it away.
