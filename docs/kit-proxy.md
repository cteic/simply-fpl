# Kit Image Proxy

SimplyFPL renders official FPL kit images on player shirts in the pitch view. We don't host the images — we proxy them through our Cloudflare Worker, which caches them at the edge.

## Why proxy instead of hotlink

- **Reliability** — if FPL changes their CDN or blocks hotlinking, we control the swap point.
- **Performance** — `caches.default` keeps the bytes warm at the same edge that serves the rest of the worker.
- **Legal hedge** — single switch in `apps/worker/src/index.ts` flips us back to a generic SVG if needed.

## URL pattern (our worker)

```
GET /kits/{teamCode}-{size}.webp        # outfield
GET /kits/gk-{teamCode}-{size}.webp     # goalkeeper
```

- `teamCode` is `FplTeam.code` from `bootstrap-static` (stable across seasons, unlike `FplTeam.id` which gets reshuffled)
- `size` is `110` or `220` (220 is used as `2x` source for retina displays)

Examples:

```
/kits/3-110.webp         Arsenal outfield, 110px
/kits/14-220.webp        Liverpool outfield, retina
/kits/gk-43-110.webp     Man City keeper, 110px
```

## Upstream (FPL CDN)

```
https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_{code}-{size}.webp
https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_{code}_1-{size}.webp
```

The `_1` suffix denotes the goalkeeper kit. FPL serves per-team GK kits (City's keeper looks different from Arsenal's keeper) — we use those rather than the generic `shirt__1-{size}.webp` fallback.

## Caching

- Edge: `Cache-Control: public, max-age=604800, immutable` (7 days)
- Backed by `caches.default` keyed on the worker pathname
- No KV — kits are binary and the edge cache is the right layer

## Fallback

If FPL returns non-200, the worker responds with a small grey shirt SVG (200 OK, 5-minute cache). The client `<Shirt>` component also has its own `onError` fallback that swaps to the existing position-coloured SVG, so a network failure or worker-side fallback never shows a broken image icon.

## Client helper

```ts
import { getKitUrl } from '@simplyfpl/fpl-client';

getKitUrl(3); // /kits/3-110.webp
getKitUrl(3, { size: 220 }); // /kits/3-220.webp
getKitUrl(43, { isGoalkeeper: true }); // /kits/gk-43-110.webp
```

The helper returns a worker URL, not an FPL URL — keep call sites pointed at our infra so we can swap the upstream silently.

## Manual verification

After `pnpm dev:web` and `pnpm dev:worker`:

1. Open a live-rank view for any team with players from a mix of clubs.
2. Confirm the 11 starters + 4 bench show real kits (not the coloured SVG).
3. Check at least one goalkeeper — should show that team's GK kit, not the outfield kit.
4. Open devtools → Network. Filter `/kits/`. First load: `X-Cache: MISS`, content-type `image/webp`. Reload: served from disk cache or `cf-cache-status: HIT`.
5. Force a 404 (curl `http://localhost:8787/kits/99999-110.webp`) — should get the grey shirt SVG with `X-Kit-Fallback: 1`.
6. Sanity-check all 20 teams: walk through `bootstrap.teams[].code` in the worker proxy response (`http://localhost:8787/fpl/bootstrap-static/`) and curl each kit URL.

Mobile rendering is not wired up yet — the Expo app's home screen is a plain RN list with no pitch view. When the mobile pitch view is built, swap the `<img>` for `expo-image` with `cachePolicy="memory-disk"` and reuse `getKitUrl` unchanged.
