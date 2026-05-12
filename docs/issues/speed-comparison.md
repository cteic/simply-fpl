# Issues — Workstream: Speed-Comparison Landing

RFC: [003-speed-comparison.md](../rfcs/003-speed-comparison.md)
Slug: `speed-comparison`
Suggested labels: `web`, `worker`, `marketing`, `speed-comparison`

Sizes: **S** = ½ day, **M** = 1–2 days, **L** = 3–5 days.

---

### SC-01 · Confirm Browser Rendering pricing + livefpl response headers — **S**

Two cheap lookups that decide which path the workstream takes:

1. Current Cloudflare Browser Rendering free tier and per-second overage (2026 pricing).
2. `curl -I https://livefpl.net/` to confirm `X-Frame-Options` / `Content-Security-Policy` / any `User-Agent` filtering.

**Acceptance:** Two-paragraph writeup in `docs/notes/speed-comparison-feasibility.md`. Goes/no-goes the production path (Browser Rendering) vs the fallback (handcrafted screenshots).

---

### SC-02 · Add Browser Rendering + R2 bindings to worker — **S**

- `wrangler.toml`: add `[[r2_buckets]] binding = "VS_BUCKET"`, `[browser] binding = "BROWSER"`, `[triggers] crons = ["0 6 * * 1"]`.
- Extend `Env` interface.
- Local `wrangler dev` boots cleanly.

**Acceptance:** `wrangler dev` runs with the new bindings. `env.BROWSER` and `env.VS_BUCKET` are accessible from a debug handler.
↳ blocked by: SC-01 (only if pricing is prohibitive, which gates whether we add the BR binding at all).

---

### SC-03 · Headless measurement script in worker — **M**

Single function in `apps/worker/src/vs/measure.ts`. Given a URL:

1. Launch a Browser Rendering instance via `env.BROWSER`.
2. Open the URL with a desktop UA.
3. Wait for a configurable selector to be non-empty (CSS selector per target site — `[data-testid="live-rank"]` or similar for SimplyFPL; an equivalent for livefpl.net, discovered empirically).
4. Capture: timestamp of selector populated, `performance.getEntriesByType('resource')` summed bytes, unique third-party hostname count.
5. Take a viewport screenshot (1280×800, JPEG quality 60).
6. Return `{ url, timeToFirstData, totalBytes, thirdPartyCount, screenshotBytes }`.

**Acceptance:** Local `wrangler dev` route `/vs/debug-measure?url=...` returns the JSON for an arbitrary URL within 30s.
↳ blocked by: SC-02

---

### SC-04 · Scheduled comparison run — **M**

- `scheduled()` event handler picks the weekly cron.
- Runs `measure()` for SimplyFPL and livefpl.net sequentially (not in parallel — keep Browser Rendering concurrency to 1 for cost).
- Writes `vs/comparison.json` (latest) and `vs/{ISO-week}/comparison.json` (history) to R2.
- Writes screenshots `vs/{ISO-week}/{slug}.jpg` to R2.
- On any error: writes `vs/last-error.json` with the failure detail; keeps the previous successful snapshot in place.

**Acceptance:** Locally `wrangler dev --test-scheduled` triggers the run and produces both R2 objects. JSON shape is stable + typed.
↳ blocked by: SC-03

---

### SC-05 · Public worker routes `/vs/data` + `/vs/screenshot/{week}/{slug}` — **S**

Read-only routes that serve the latest snapshot JSON and the requested screenshot. CORS open for the web app origin. Cache-Control: 1 hour public.

**Acceptance:** `curl https://worker.simply-fpl.workers.dev/vs/data` returns the latest snapshot; image route returns a 200 with `image/jpeg`.
↳ blocked by: SC-04

---

### SC-06 · `/vs-livefpl` landing page — **M**

- New route `apps/web/src/app/vs-livefpl/page.tsx`.
- Server fetches `/vs/data` at render time (revalidate hourly).
- Composes: metric cards (time to first data, total bytes, third-party count), screenshots side-by-side, methodology section, "last measured" timestamp.
- Components in `packages/ui` where reusable (a `<MetricCompareCard>` is the only new one); page composition stays in the app.
- Tone copy reviewed before merge (no trash talk; acknowledge livefpl's longevity).

**Acceptance:** Page loads in <1s on Pages preview. All numbers reflect the live R2 JSON. Visual smoke test against the design system tokens.
↳ blocked by: SC-05

---

### SC-07 · "Test it yourself" widget — **M**

Client component on `/vs-livefpl`. On click:

1. Calls `/vs/timed-fetch?url=https://livefpl.net/`. Worker fetches server-side, returns `{responseStartMs, totalMs, statusCode}` JSON.
2. Same for `/vs/timed-fetch?url=https://simply-fpl.pages.dev/`.
3. Renders the two numbers with a disclaimer ("byte-timing only, not page render — full render comparison is the weekly table above").

New worker route `/vs/timed-fetch?url=...` with an allowlist of URLs (only the two we care about — prevent the route becoming an open proxy).

**Acceptance:** Click → results within 5s. Pass an arbitrary URL → 400. Worker allowlist enforced.
↳ blocked by: SC-06 (page exists)

---

### SC-08 · Fallback: hand-curated comparison if SC-01 says Browser Rendering is too expensive — **M**

Only if `SC-01` flags Browser Rendering as not viable. Replace SC-03/04/05 with:

- A `docs/vs-livefpl/` directory of screenshots + a hand-edited `comparison.json`.
- A simple build-time fetch in `/vs-livefpl/page.tsx` from the static JSON.
- Manual refresh process documented (`docs/vs-livefpl/HOW-TO-REFRESH.md`).

**Acceptance:** Page is live with credible numbers within 1 day of the BR path being declared out.
↳ Conditional: only runs if SC-01 verdict is no-go.

---

### SC-09 · Legal sanity check — **S**

Before publishing publicly, a quick read of UK CAP/BCAP rules on comparative advertising (or a free 30-min legal consult). The page must be truthful, not misleading, like-for-like, and not denigrate the competitor.

**Acceptance:** A short note in `docs/notes/vs-livefpl-legal.md` confirming the page passes the comparative-advertising bar, or listing the specific copy changes needed.
↳ blocks: public launch of SC-06.

---

### Out of scope (filed as future)

- **SC-Future-A** Add livefpl.com and fpl.team columns. Layout change only after the first comparison ships.
- **SC-Future-B** Multi-region timing (run from EU, US, AU). Marketing-y but only worth it if the single-region story is somehow misleading.
- **SC-Future-C** Discord/email alert when the weekly run fails. Nice-to-have, not launch-critical.
- **SC-Future-D** Track historical regression graph publicly. Don't do this — surfaces our own slowdowns at the worst time.

## Suggested order

`SC-01` → branch: either (SC-02 → SC-03 → SC-04 → SC-05 → SC-06 → SC-07 → SC-09) or (SC-08 → SC-06 stub → SC-09). Either way, `SC-09` is the public-launch gate.
