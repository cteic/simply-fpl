# packages/features — cross-platform business logic

React-aware orchestration shared by web and native: hooks, auth and
subscription state, feature logic that is not pure enough for `fpl-client`.

## Rules

- MUST NOT import `react-native`, `next`, `expo`, or any other platform-specific
  package. This is the boundary that keeps the package usable from both apps —
  a single platform import breaks it silently.
- Generic React hooks (`useEffect`, `useMemo`, …) only; no platform-specific
  React APIs.
- Pure logic with no React belongs in `packages/fpl-client` instead.

## Testing

**Test coverage matters here more than anywhere else** — this is the heart of
the product, and it is the layer both apps depend on. New behaviour lands with a
`.feature` scenario and step definitions; bug fixes land with a regression test.
