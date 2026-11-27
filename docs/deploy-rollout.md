# Production rollout and rollback

A push to `main` no longer sends a new web Worker version straight to 100% of
traffic. The Deploy workflow uploads the new version, checks it in stages, and
only then promotes it. If any check fails, the workflow sends all traffic back
to the version that was live before and the job goes red.

The code lives in `scripts/rollout/` and runs from the `web` job in
`.github/workflows/deploy.yml`.

## How a rollout works

Two terms first:

- **Stable version**: the version serving 100% of production when the run starts.
- **Candidate**: the version this push uploaded.

| Stage                | Traffic to candidate     | Check                                                                                        | On failure                      |
| -------------------- | ------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------- |
| 1. Upload            | none (not deployed)      | `wrangler versions upload` succeeds                                                          | job fails, production untouched |
| 2. Dark              | 0%                       | smoke suite, then a 60 s soak, both pinned to the candidate                                  | stable back to 100%             |
| 3. Canary (optional) | `ROLLOUT_CANARY_PERCENT` | pinned probes every 15 s for `ROLLOUT_WATCH_SECONDS` (default 300), then the error-rate gate | stable back to 100%             |
| 4. Promote           | 100%                     | smoke suite against the public URL, no pin                                                   | stable back to 100%             |
| 5. Routes            | 100%                     | `wrangler triggers deploy` applies any route change                                          | job fails, version stays        |

"Pinned" means each request carries the
`Cloudflare-Workers-Version-Overrides: simply-fpl="<candidate-id>"` header.
Cloudflare routes that request to the candidate even at 0%, so stage 2 tests
the real production hostname, bindings and secrets with no user exposure.

The **smoke suite** fetches `/`, `/robots.txt` and `/privacy`, then the first
`/_next/static/` file the home page references. Each must answer 2xx or 3xx
within 15 s. Each path gets three attempts, 5 s apart. The static-file check
catches a version whose assets did not upload.

After every traffic change the script waits 20 s before probing. Cloudflare
documents a short propagation delay, during which an override header can be
ignored.

## What triggers a rollback

| Signal                                   | Threshold                                               |
| ---------------------------------------- | ------------------------------------------------------- |
| Smoke path fails all three attempts      | any one path                                            |
| Soak or canary probes fail               | more than 2% of probes                                  |
| Canary error rate (Workers analytics)    | more than 2% of invocations, once there are at least 50 |
| A `wrangler versions deploy` call errors | any                                                     |

A rollback runs `wrangler versions deploy <stable>@100%` with a message naming
the candidate and the reason. The step summary on the run shows every stage.
If the rollback call itself fails, the summary says `ROLLBACK FAILED` and names
the version to restore by hand.

## Settings

| Name                         | Kind          | Effect                                                     |
| ---------------------------- | ------------- | ---------------------------------------------------------- |
| `ROLLOUT_CANARY_PERCENT`     | repo variable | 0 to 50. Unset or 0 skips stage 3.                         |
| `ROLLOUT_WATCH_SECONDS`      | repo variable | Length of the canary watch. Default 300.                   |
| `CLOUDFLARE_ANALYTICS_TOKEN` | repo secret   | Enables the error-rate gate. Needs Account Analytics Read. |

Two limits apply before turning the canary on:

1. **Asset skew.** With a split, Cloudflare picks a version per request. A page
   from the candidate can ask for a `/_next/static/` file that the stable
   version does not have, and get a 404. Fix it first with a zone Transform
   Rule that sets the `Cloudflare-Workers-Version-Key` request header to
   `ip.src`, so one visitor stays on one version. This rule cannot apply on
   `*.workers.dev`.
2. **Error-rate gate.** The GraphQL query filters `workersInvocationsAdaptive`
   by `scriptVersion`. That filter has not been checked against the live
   schema. If the query errors, the run logs a warning and continues on probes
   alone. It does not pass or fail on a broken query.

## Roll back by hand

From GitHub: **Actions → Rollback web → Run workflow**. Enter the version id
and a reason. Tick `dry_run` to see the command without running it. The
workflow refuses an id that is not a version of this Worker, then
smoke-checks the public URL.

To find a version id:

```bash
cd apps/web && pnpm exec wrangler versions list
```

Each Deploy run's step summary also lists the stable and candidate ids.

From a terminal, with a token that can edit Workers:

```bash
cd apps/web && pnpm exec wrangler versions deploy <version-id>@100% --yes --message "manual rollback"
```

`wrangler rollback <version-id>` does the same thing. Cloudflare blocks a
rollback to a version that binds a KV namespace, R2 bucket or queue that no
longer exists, and to any version older than the latest 100.

A rollback does not undo database migrations. The `migrate` job pushes them
before the web job starts.

## Testing changes to the rollout

```bash
node --test scripts/rollout/*.test.mjs
```

The tests drive the full flow against a fake Cloudflare: healthy promote,
failed dark smoke, missing assets, canary error rate, failed public smoke, and
a rollback that itself fails.

Every PR also runs `cli.mjs smoke` against its own preview version. That
exercises the real smoke suite without touching production.

To watch a release without changing traffic, against production:

```bash
node scripts/rollout/cli.mjs release --candidate <id> --stable <id> --dry-run
```

`--dry-run` prints each traffic change instead of running it. The probes still
run. The candidate must already be in the deployment for pinned probes to reach
it, so in a dry run they hit the stable version.
