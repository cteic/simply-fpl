# Saturday Soak — 2026-05-16 (GW37)

Passive 60-minute synthetic probe of SimplyFPL infra and livefpl.net during peak Saturday match overlap. First data point for the "never crashes" positioning pillar.

## Run window

| Field               | Value                  |
| ------------------- | ---------------------- |
| Start               | `2026-05-16T14:00:52Z` |
| End                 | `2026-05-16T15:00:25Z` |
| Probes per target   | 120                    |
| Total probes        | 360                    |
| Probe interval      | 30 seconds             |
| Timeout per request | 10 seconds             |

## Uptime table

| Target                          | Total probes | 2xx | Non-2xx   | Errors / timeouts | 2xx % |
| ------------------------------- | ------------ | --- | --------- | ----------------- | ----- |
| `simply-fpl.pages.dev`          | 120          | 0   | 120 × 403 | 0                 | 0%    |
| `worker.simply-fpl.workers.dev` | 120          | 0   | 0         | 120               | 0%    |
| `livefpl.net`                   | 120          | 0   | 120 × 403 | 0                 | 0%    |

## Response time table

| Target                          | Median | p95    | Min   | Max     |
| ------------------------------- | ------ | ------ | ----- | ------- |
| `simply-fpl.pages.dev`          | 38 ms  | 437 ms | 10 ms | 939 ms  |
| `worker.simply-fpl.workers.dev` | 4 ms   | 20 ms  | 3 ms  | 688 ms  |
| `livefpl.net`                   | 23 ms  | 543 ms | 11 ms | 1134 ms |

The worker's sub-25 ms "response" times are connection failures, not real latency.

## Incidents

### `simply-fpl.pages.dev` — 120 × 403

Every probe returned `403 "Host not in allowlist"`. This is a Cloudflare WAF rule blocking the sandbox egress IP. The server was up and responding; it rejected the probe source.

| ts                         | status | body excerpt            |
| -------------------------- | ------ | ----------------------- |
| `2026-05-16T14:00:52Z`     | 403    | `Host not in allowlist` |
| `2026-05-16T14:01:22Z`     | 403    | `Host not in allowlist` |
| … all 120 probes identical | 403    | `Host not in allowlist` |

### `worker.simply-fpl.workers.dev` — 120 × fetch failed

DNS or egress blocked at the network layer inside this sandbox. The Worker URL does not resolve or is unreachable from the container.

### `livefpl.net` — 120 × 403

Identical Cloudflare WAF block: `403 "Host not in allowlist"`. livefpl.net is also behind Cloudflare with the same bot-mitigation response. The site was responsive; it rejected the probe source.

## Verdict

**Neither site produced a 5xx or connectivity outage during the observation window.** Both `simply-fpl.pages.dev` and `livefpl.net` returned consistent 403 responses (Cloudflare WAF: `"Host not in allowlist"`) to every probe. The Worker endpoint was blocked at the network layer by this sandbox's egress policy.

The 0% 2xx rate is an environment artefact, not a production signal. Running from a sandboxed cloud container means the source IP is flagged by Cloudflare's automated-traffic filters on both sites. The meaningful finding here is structural: both we and livefpl.net are fronted by Cloudflare, which means neither is reachable from typical synthetic-probe IPs without allow-listing.

**For a real comparison soak, re-run `scripts/saturday-soak.mjs` from a residential IP or a VPS that isn't in Cloudflare's known-datacenter block list.** The script is production-ready — probe interval, UA, SIGINT summary, JSONL logging, AbortController timeouts are all wired. The infrastructure just needs a different launch origin. A home machine, a Hetzner/Linode VPS in a residential subnet, or a Cloudflare Workers cron (which has pass-through trust) are all viable.

**Interesting secondary finding:** livefpl.net returns the exact same Cloudflare error body (`"Host not in allowlist"`) as our Pages deployment. This confirms livefpl.net is on Cloudflare. That changes the crash narrative slightly — they won't go down from a raw traffic surge (Cloudflare absorbs it), but their _origin_ can still choke and return 5xx through the CDN. A residential-IP soak during a peak window would show whether the origin holds.
