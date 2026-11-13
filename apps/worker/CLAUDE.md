# apps/worker — Cloudflare Worker

The FPL proxy and KV cache. Every FPL API call in the product goes through here;
clients never call the FPL API directly.

## Rules

- Live gameweek data refreshes every 60 seconds — consumers should respect that
  in `refetchInterval`, and this worker should not cache it longer.
- `bootstrap-static` is safe to cache for an hour.
- Keep domain logic in `packages/fpl-client`. This app is transport, caching and
  scheduling — not a place for algorithms.
