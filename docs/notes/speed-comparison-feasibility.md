# Speed-comparison feasibility (SC-01)

Two facts needed before choosing the production path for `/vs-livefpl`.

---

## livefpl.net headers

**Result: could not verify — sandbox network restriction.**

Both curl probes were blocked by the Anthropic sandbox egress proxy before reaching livefpl.net. The TLS certificate presented during the connection was issued by `O=Anthropic; CN=sandbox-egress-production TLS Inspection CA` (confirming TLS interception), and both requests terminated with:

```
HTTP/2 403
x-deny-reason: host_not_allowed
content-type: text/plain
```

This is a proxy-level rejection, not a response from livefpl.net itself. No headers from the origin server were retrieved.

**Commands run (for reproducibility — re-run outside sandbox):**

```
curl -I -A 'Mozilla/5.0 (compatible; SimplyFPL-Research/0.1; +github.com/pete-watters/simply-fpl)' https://livefpl.net/
curl -I -A 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36' https://livefpl.net/
```

**What to look for when re-running:**

| Header                                                        | Implication for Browser Rendering path                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `X-Frame-Options: DENY` or `SAMEORIGIN`                       | Blocks iframe embedding — irrelevant to screenshot approach, only matters if we ever embed |
| `Content-Security-Policy: frame-ancestors 'none'` or `'self'` | Same as above                                                                              |
| Different HTTP status between the two UAs                     | livefpl.net filters headless Chrome UAs — would block Browser Rendering screenshots        |
| Same status for both UAs                                      | No UA filtering — Browser Rendering can screenshot freely                                  |

The UA-filtering check (third row) is the load-bearing unknown for the Browser Rendering path.

---

## Cloudflare Browser Rendering pricing (verified 2026-05-13)

**Source:** Cloudflare Changelog, announced 2025-07-28, billing started 2025-08-20.
URL: `https://developers.cloudflare.com/changelog/post/2025-07-28-br-pricing/`

The product is now documented under the name **Browser Run** at `https://developers.cloudflare.com/browser-run/`.

### Included free allowances

| Plan                 | Included browser time  | Concurrent browsers   |
| -------------------- | ---------------------- | --------------------- |
| Workers Free         | 10 minutes **per day** | 3                     |
| Workers Paid ($5/mo) | 10 hours **per month** | 10 (averaged monthly) |

### Overage rate

**$0.09 per browser hour** beyond the included allowance.

### Cost projection for our weekly cadence

- Load time per site: ~30 seconds
- Sites per run: 2 (SimplyFPL + livefpl.net)
- Runs per month: 4 (weekly scheduled worker)
- **Total: 30s × 2 × 4 = 240 seconds = 4 minutes/month**

On the **Workers Free plan**: 4 min/month spread over 4 weekly runs ≈ 1 min/run, well under the 10 min/day daily cap. No cost.

On the **Workers Paid plan**: 4 min vs. 600 min included monthly allowance — 0.7% of the free quota. No cost.

**Hypothetical overage cost** (if somehow over quota): 4 min × ($0.09/60 min) ≈ $0.006/month — negligible.

**Conclusion: Browser Rendering cost is zero at our cadence on either plan.**

---

## Verdict

**Proceed with the Browser Rendering path (SC-02/03/04/05/06/07/09).**

Pricing is no obstacle — our weekly ~4 min/month usage sits entirely within the Workers Free plan's daily cap and is a rounding error against the Paid plan's monthly inclusion.

The one unresolved risk is **UA filtering by livefpl.net**: we could not confirm whether headless Chrome requests reach the origin or are blocked. This must be verified manually (re-run the two curl commands outside the sandbox) before SC-02 implementation begins. If livefpl.net does block headless UAs, drop to the static-screenshot fallback (SC-08) or investigate spoofing the UA string in the Browser Rendering worker.

X-Frame-Options / CSP `frame-ancestors` are irrelevant to the screenshot approach and do not affect the verdict.
