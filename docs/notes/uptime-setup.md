# Uptime + health monitoring

Status: **Code shipped, signups pending** (2026-05-15).
Issue: [#33](https://github.com/pete-watters/simply-fpl/issues/33)

## What's already in the repo

| Endpoint                                  | Returns                                                  | Status code semantics                    |
| ----------------------------------------- | -------------------------------------------------------- | ---------------------------------------- |
| `https://simply-fpl.pages.dev/status`     | HTML (default) or JSON (with `Accept: application/json`) | `200` healthy / `503` any subsystem down |
| `${workerUrl}/status` (Cloudflare Worker) | JSON only                                                | `200` healthy / `503` any subsystem down |

Both endpoints check the same subsystems (the web page fetches the worker under the hood and renders it), so monitoring either is sufficient. The web URL is the recommended target — if the Pages deploy is broken, the monitor catches that too.

### Sample response

```json
{
  "worker": "ok",
  "kv": "ok",
  "fpl": "ok",
  "durable_object": "ok",
  "version": "5b18e79",
  "timestamp": "2026-05-15T12:00:00.000Z"
}
```

### Verifying locally

```sh
# Web (HTML)
curl -i https://simply-fpl.pages.dev/status

# Web (JSON)
curl -i -H "Accept: application/json" https://simply-fpl.pages.dev/status

# Worker direct
curl -i https://simplyfpl-worker.<account>.workers.dev/status
```

A healthy response is `HTTP/2 200` with `"worker":"ok"` in the body and every subsystem `"ok"`. Any `"error: ..."` or `"down"` flips the response to `503`.

## Manual steps Pete needs to do

### 1. Better Stack (recommended — free tier, 10 monitors)

1. Sign up at <https://betterstack.com/uptime> with the SimplyFPL ops email.
2. **Create a monitor:**
   - Type: **HTTPS**
   - URL: `https://simply-fpl.pages.dev/status`
   - Check frequency: **90 seconds** (free tier allows down to 30s; 90s is plenty and minimises FPL upstream load — see caveats)
   - Request method: `GET`
   - Expected status code: `200`
   - **Response body check (regex):** `"worker":"ok"` and `"fpl":"ok"`
   - Timeout: `10s`
   - Regions: pick 2–3 (EU + US is enough — picking more inflates FPL traffic without telling us anything new)
3. **Alerting:**
   - On-call escalation: email Pete immediately
   - Optional: Slack integration → `#simplyfpl-alerts` (create channel first)
   - Reminder interval: 5 minutes
   - Resolve notification: on
4. **Status page (optional, free tier):**
   - Create a public status page pointed at this monitor at `status.simplyfpl.com` (or a Better Stack subdomain). Linkable from the footer pre-launch.

### 2. Alternative: Cloudflare options

- **Cloudflare Health Checks** (paid only — requires Pro plan or higher). Don't pay for this; Better Stack covers it on the free tier.
- **Cloudflare Workers Cron Trigger**: cheap DIY option. Add a cron-triggered Worker that hits `/status` and posts to Slack/Discord on failure. Worth doing only if we outgrow Better Stack's free 10 monitors — track in a follow-up issue.
- **Cloudflare Notifications** (free): set up `Worker Errors` and `Pages Deployment Failed` notifications in the Cloudflare dashboard. Not a substitute for an uptime monitor (those only fire on infra failures, not on `503` from `/status`), but worth turning on as a second signal.

## Caveats

- **FPL upstream check is rate-sensitive.** The worker's `/status` endpoint hits `bootstrap-static` on every probe. At 90s intervals from 3 regions that's ~960 requests/day per region — well under any plausible rate limit, but **don't drop below 60s** without re-checking. If FPL ever 429s us, the canary is the first thing to feel it.
- **Worker cold-start adds ~50–200ms** to the first probe in each region. Don't set the timeout below 5s.
- The KV check writes a `health-check` key with a 60s TTL on every probe. That's negligible (10k free writes/day on Cloudflare's free plan) but worth knowing if you're auditing KV usage.
- `durable_object` only verifies that the DO namespace binding resolves — it doesn't open a WebSocket. Open a follow-up if we want a deeper DO probe.
- The `version` field reports `"unknown"` until we wire `GIT_SHA` through `wrangler deploy --var GIT_SHA:$(git rev-parse --short HEAD)` in CI. Tracked as a TODO in `apps/worker/wrangler.toml`.

## Follow-ups

- Wire `GIT_SHA` into the Worker deploy command (CI change).
- Decide whether to expose a public status page (Better Stack hosts one free).
- Consider a second, cheaper probe target (`/api/health` on Pages without hitting the Worker) if FPL upstream check turns out to flap.
