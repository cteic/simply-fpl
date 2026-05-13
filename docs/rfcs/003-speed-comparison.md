# RFC 003 — Speed-Comparison Landing Page

Status: Draft
Author: Pete
Last updated: 2026-05-12
Workstream slug: `speed-comparison`
Depends on: RFC 001 (the numbers only look good once fan-out ships).

## 1. Goal

A landing page at `/vs-livefpl` that shows visitors a tasteful, factual side-by-side: SimplyFPL vs livefpl.net on real numbers (time-to-first-data, page weight, ad density). Marketing artefact for the co-founder to share, and a credibility piece for first-time visitors evaluating us against the incumbent.

User-facing outcome:

- One scrollable page with 2–4 honest comparisons.
- "Test it yourself" component lets visitors trigger a fresh comparison from their browser.
- Numbers update weekly without manual intervention.
- Tone: factual. No trash-talk. Acknowledge what livefpl does well.

## 2. Why this is harder than it looks

Three approaches, ranked by ambition:

| #   | Approach                                                                                              | Verdict                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | Side-by-side iframes, time both pages                                                                 | **Won't work for livefpl.net** — almost certainly sets `X-Frame-Options` or CSP `frame-ancestors`. Trivial to prove with a `curl -I`. Verify in `SC-01`. |
| B   | Browser Rendering API runs headless Chromium against both, captures timings + screenshots, ships JSON | **The right answer.** Cloudflare-native, scheduled weekly, cheap.                                                                                        |
| C   | Static page with hand-curated screenshots                                                             | Fallback if (B) prices badly. Cheaper but stales fast.                                                                                                   |

The user request mentions all three. Real plan: (A) is dead on arrival, (B) is the production path, (C) is the no-Browser-Rendering escape hatch. The "test it yourself" widget on the page can do a **client-side timing of `simply-fpl.pages.dev` against a same-origin `/api/timed-fetch?url=...`** that fetches livefpl.net via the Worker — limited (no rendering, just byte timing), but honest, and works regardless of (B) shipping.

## 3. Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │  Cloudflare Worker — apps/worker             │
                    │                                              │
                    │  scheduled() (cron: weekly, Mon 06:00 UTC)   │
                    │    └─ /run-comparison                        │
                    │         ├─ Browser Rendering: fetch SimplyFPL│
                    │         │   measure FCP, LCP, total bytes,   │
                    │         │   screenshot                       │
                    │         ├─ Browser Rendering: fetch livefpl  │
                    │         │   same metrics                     │
                    │         └─ writeJSON to R2: comparison.json  │
                    │                                              │
                    │  GET /vs/data → reads R2, returns JSON       │
                    │  GET /vs/screenshot/{slug}.png → R2 image    │
                    │  POST /vs/timed-fetch → byte-timing fallback │
                    └──────────────────────────────────────────────┘
                                       │
                    ┌──────────────────┴────────────────────────────┐
                    │  Web — apps/web                               │
                    │                                               │
                    │  /vs-livefpl/page.tsx                         │
                    │    ├─ Server fetches /vs/data on render       │
                    │    ├─ Renders metric cards + screenshots      │
                    │    └─ Client "Test it yourself" component     │
                    └───────────────────────────────────────────────┘
```

## 4. What we measure

Three honest, defensible numbers. Resist the temptation to add more.

1. **Time to first FPL data on screen.** For SimplyFPL: timestamp the live-rank cell visible. For livefpl: timestamp when the live points number is non-empty. Same metric: "from `goto` to `text content of selector is non-empty and non-zero`."
2. **Total bytes transferred on first load.** `Performance.getEntriesByType('resource')` summed. Strip query params. Cap measurement window at 10s.
3. **Number of third-party requests.** Hostname diff from the landing origin. Proxy for ad density and tracker count without saying "ads bad."

Explicitly **don't** measure things that look tilted:

- No "ad count" — subjective, livefpl will say their ads are fair.
- No Lighthouse score — depends on lab settings, easy to argue with.
- No subjective "design quality" — that's what screenshots are for; let the user see.

## 5. Cloudflare-specific concerns

### Browser Rendering API

- Lives in `apps/worker`. Requires `browser_rendering` binding in `wrangler.toml`.
- Pricing is metered per **browser-second** (real-time wall clock of the headless instance). A typical run: ~30s × 2 sites × 1/week = ~5 minutes/month → effectively free at hobby tier. Confirm pricing as part of `SC-01` since I'm not 100% sure of the current free quota / overage cost.
- Same Worker handles scheduled run, JSON serving, and the timed-fetch fallback. No new Worker.

### R2

- Store the latest snapshot at a fixed key (`vs/comparison.json`) plus dated keys (`vs/2026-W19/comparison.json`) so we have a small history. Screenshots at `vs/{date}/simplyfpl.png` and `vs/{date}/livefpl.png`.
- R2 is cheap; storage cost is dominated by the screenshots (~200KB × 2 × 52 weeks = ~20MB/year, trivial).
- New binding in `wrangler.toml`: `[[r2_buckets]] binding = "VS_BUCKET"`.

### Why R2 instead of KV?

- Screenshots are bytes, not strings — natural fit.
- KV is for tiny hot values; R2 is for blobs.
- The JSON snapshot could go in either, but living next to the screenshots is tidier.

### Cron trigger

```toml
[triggers]
crons = ["0 6 * * 1"]  # 06:00 UTC every Monday
```

If RFC 002 also adds a scheduled handler (pick warming), they share the same `scheduled()` entry point with a dispatch switch on `event.cron`.

## 6. Failure modes + fallbacks

| Failure                                       | Behaviour                                                                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| livefpl.net blocks the Browser Rendering UA   | Use a realistic UA string; if still blocked, fall back to byte-only timing (no render).                                      |
| Browser Rendering quota exceeded              | The page renders the last successful snapshot from R2. We're never live-rendering on user request.                           |
| livefpl.net layout changes — selector misses  | Cron writes a warning to `vs/last-error.json`. Page renders previous snapshot. We get an alert if we wire one.               |
| Our own page is slower this week (regression) | Surfaces in the data. **Don't hide it.** Page just shows current numbers; if we regress we fix it.                           |
| Run takes >30s                                | Hard timeout in the script. Falls back to whatever metrics were captured.                                                    |
| iframe approach attempted by client widget    | livefpl will refuse to frame. Widget handles this gracefully and shows "livefpl blocks framing — using byte-timing instead." |

## 7. Open questions + trade-offs

- **Browser Rendering pricing in 2026.** I'm not certain of the current free tier. **Prereq issue (`SC-01`)**: verify pricing and free quota before scheduling. If pricing is awkward, fall through to (C) — handcrafted screenshots refreshed manually.
- **livefpl.net might change.** A redesign breaks our selectors. Mitigation: monitor for "no data found on livefpl" errors in the cron output; alert via Discord webhook or email (separate, optional).
- **Risk of looking petty.** This is a marketing page about a competitor. Tone matters more than the numbers. Page must include: (a) acknowledgment that livefpl has been the standard for years, (b) "test it yourself" so people verify, (c) "we'll keep this page updated even if our numbers get worse" — credibility hinges on it.
- **Legal.** Comparative advertising is fine in the UK/EU as long as it's truthful, not misleading, doesn't denigrate, and compares like-for-like services. We're fine. Not naming individual people. Not making subjective performance claims without data. Worth a 5-minute read of the UK BCAP/CAP code on comparative claims before launching publicly.
- **Should the page also compare livefpl.com and fpl.team?** Yes eventually, but ship the livefpl.net comparison first — that's the dominant incumbent. Adding a third column is a small layout change later.
- **"Test it yourself" widget** — see §8. The hardest piece, because in-browser fetches to livefpl.net hit CORS. Workaround: route through our Worker which proxies and timestamps. This measures byte-timing, not paint timing — be honest in the widget label about that distinction.
- **Why not just run Lighthouse in CI?** Tempting, but Lighthouse measures Lighthouse, not actual user experience. The page promises real numbers — Browser Rendering gives a real Chromium with no special tuning, which is closer to what a user actually sees.

## 8. The "test it yourself" widget

Client-side, in-browser:

1. Visitor clicks "Run the test."
2. Browser starts a `performance.now()` timer, fetches `/vs/timed-fetch?url=https://livefpl.net/` via our Worker. Worker fetches it server-side and streams headers back with timing. Records `responseStart` and `responseEnd` from Worker side.
3. Browser starts a second timer, fetches `/vs/timed-fetch?url=https://simply-fpl.pages.dev/`. Same metrics.
4. Display: "From your location: SimplyFPL responded in X ms, livefpl in Y ms (byte-timing only, not page render)."
5. Disclaimer below: "This measures network response, not full page render. Render comparisons are in the table above and refresh weekly."

Honest, useful, no false claims.

## 9. Page content sketch

```
┌─────────────────────────────────────────────────────────────┐
│ SimplyFPL vs livefpl                                        │
│ Last measured: 2026-W19 (Monday morning, automated)         │
│                                                             │
│ ┌─────────────────────┐  ┌─────────────────────┐            │
│ │ Time to first data  │  │ Page weight (first  │            │
│ │ SimplyFPL: 0.9s     │  │   load)             │            │
│ │ livefpl:   3.4s     │  │ SimplyFPL: 320 KB   │            │
│ └─────────────────────┘  │ livefpl:  1.8 MB    │            │
│                          └─────────────────────┘            │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Screenshot side-by-side (clickable to full)             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [ Run the test from your browser ]                      │ │
│ │ ...results...                                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Methodology: …                                              │
│ Source code: github.com/pete-watters/simply-fpl/...         │
└─────────────────────────────────────────────────────────────┘
```

## 10. Non-goals

- Real-time comparison on every visit (cost, lag, livefpl rate-limit exposure).
- Multi-region testing (single Cloudflare colo is fine for a comparison page — it's not the product).
- Comparison with the mobile experience of livefpl (separate page, separate work).
- A "live leaderboard" or anything gamified — tone is factual.
- Public-facing dashboards of historical trends — keep it to "now vs the past few snapshots" if anything.

## 11. Open questions explicitly flagged for prereq measurement

- `SC-01`: confirm Cloudflare Browser Rendering free quota and per-second pricing for 2026.
- `SC-02`: confirm livefpl.net response headers (`X-Frame-Options`, `Content-Security-Policy`, `User-Agent` filtering) — informs whether iframe path is dead, byte-timing works, etc.
