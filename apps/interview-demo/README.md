# interview-demo

A standalone Three.js + Y.js demo built **for an interview**, not part of the SimplyFPL product. Demonstrates competence with two specific libraries by combining them on a single page.

## What it does

- A 3D pitch (Three.js via `@react-three/fiber`) with 11 player tokens arranged in a 4-4-2.
- The 11 starters are the top scorers from the live FPL API (pulled via the existing SimplyFPL worker proxy).
- Drag any token to move it. The new x/z position writes to a `Y.Map<PlayerPos>` shared over WebRTC.
- Open the same URL in another tab (or share with a peer) and every drag syncs in ~50ms.
- A presence panel shows connected peers (Y.js awareness protocol).
- Optional room scoping: append `#my-room` to the URL.

## Why this combination

Three.js and Y.js answer different problems but compose well: render a shared spatial state, mutate it collaboratively. Real-world cases — Figma's canvas, multiplayer 3D editors, CAD review tools — sit at exactly this intersection.

## Trade-offs I made

- **WebRTC over WebSocket**: no sync server needed for a 2-4 peer demo. Y.js's public signaling servers handle peer discovery. For prod you'd swap in a Cloudflare Durable Object as a centralised `y-websocket`-compatible provider.
- **Y.Map keyed by player id**: simpler than a `Y.Array` reorder dance, and conflict resolution becomes "last write wins per key" — which is exactly what you want for position drags.
- **Per-move sync, not per-drop**: every pointer-move sends a delta. Y.js coalesces and the awareness layer keeps it sub-frame, so cursor latency is the headline number.
- **No persistence**: positions reset on full disconnect of all peers. Plug in `y-indexeddb` for offline, or persist the Y doc snapshot from a server.
- **Standalone Vite app**: deliberately separate from the SimplyFPL Next.js app to keep three.js's ~150KB bundle out of the main product.

## Run locally

```
pnpm i
pnpm --filter @simplyfpl/interview-demo dev
```

Open http://localhost:3030 in two tabs and drag tokens.

## Deploy

Build:

```
pnpm --filter @simplyfpl/interview-demo build
```

Deploy to Cloudflare Pages (first run creates the project):

```
pnpm --filter @simplyfpl/interview-demo deploy
```

Final URL: `https://simply-fpl-interview-demo.pages.dev`.

## File map

| File                  | Role                                                                         |
| --------------------- | ---------------------------------------------------------------------------- |
| `src/App.tsx`         | Layout: Canvas + panels                                                      |
| `src/Pitch.tsx`       | 3D pitch geometry (plane + line markings + centre circle)                    |
| `src/PlayerToken.tsx` | Draggable token with raycast-to-plane drag, hover/select state, name label   |
| `src/use-y-room.ts`   | Y.Doc + WebrtcProvider; exposes positions map + awareness peers              |
| `src/use-fpl-data.ts` | Fetches `/bootstrap-static/` via the SimplyFPL worker, picks 442 top scorers |
| `src/types.ts`        | Shared types                                                                 |
