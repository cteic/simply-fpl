# Stale Branch Report

**Run date (UTC):** 2026-07-04

**Total stale branches:** 160

Branches that have not been pushed to in 30+ days and have no open PR.

| Branch                                        | Last commit | Age (days) | Last commit subject                                                              |
| --------------------------------------------- | ----------- | ---------- | -------------------------------------------------------------------------------- |
| `fix/price-changes-threshold`                 | 2026-05-12  | 52         | Merge remote-tracking branch 'origin/dev' into fix/price-changes-threshold       |
| `fix/leagues-uses-team-id`                    | 2026-05-12  | 52         | fix(web): unify leagues view across auth states                                  |
| `fix/input-styling`                           | 2026-05-12  | 52         | chore: prettier                                                                  |
| `fix/home-auto-redirect-saved-team`           | 2026-05-12  | 52         | fix(web): auto-redirect home to /rank/[id] when team ID is saved                 |
| `fix/ci-worker-deploy`                        | 2026-05-12  | 52         | fix(ci): worker deploy uses 'run deploy' to disambiguate from pnpm subcommand    |
| `fix/auth-callback-edge`                      | 2026-05-12  | 52         | fix(web): edge runtime on /auth/callback for Cloudflare Pages                    |
| `feat/tamagui-1.144-extraction-experiment`    | 2026-05-12  | 52         | wip: tamagui 1.144 ssr extraction experiment                                     |
| `feat/profile-fpl-entry-id`                   | 2026-05-12  | 52         | feat(auth): sync FPL entry ID between localStorage and profiles                  |
| `feat/planner-real-data-revival`              | 2026-05-12  | 52         | feat(web): real-data transfer planner (free tier)                                |
| `feat/mvp-polish`                             | 2026-05-12  | 52         | docs: note husky pre-commit format gotcha in CLAUDE.md                           |
| `feat/live-rank-pill-header`                  | 2026-05-12  | 52         | fix(web): wrap HomeSearchView in Suspense for static prerender                   |
| `feat/lf-02-do-scaffold`                      | 2026-05-12  | 52         | feat(worker): LiveGwDO scaffolding + /live/ws upgrade route (LF-02, LF-03)       |
| `feat/lf-01-cadence-measurement`              | 2026-05-12  | 52         | feat(scripts): FPL /event/live cadence measurement (LF-01)                       |
| `feat/kit-proxy`                              | 2026-05-12  | 52         | refactor(worker): share FPL host across API + CDN origins                        |
| `feat/head-to-head-comparison`                | 2026-05-12  | 52         | feat(web): side-by-side pitches + bench in h2h view                              |
| `feat/h2h-pitches-and-bench`                  | 2026-05-12  | 52         | fix(web): wrap HomeSearchView in Suspense for static prerender                   |
| `docs/competitive-rfcs`                       | 2026-05-12  | 52         | docs: RFCs + issue checklists for competitive workstreams                        |
| `spike/tamagui-ssr-research`                  | 2026-05-13  | 51         | docs(notes): Tamagui SSR feasibility spike                                       |
| `spike/next-16-upgrade`                       | 2026-05-13  | 51         | docs(notes): Next.js 16 upgrade spike                                            |
| `research/sc-01-speed-comp-feasibility`       | 2026-05-13  | 51         | docs(notes): SC-01 speed-comparison feasibility                                  |
| `research/rv-01-league-paging`                | 2026-05-13  | 51         | docs(notes): RV-01 league paging behaviour                                       |
| `fix/leagues-ui-quick-wins`                   | 2026-05-13  | 51         | chore: prettier                                                                  |
| `fix/husky-format-restage`                    | 2026-05-13  | 51         | fix(infra): husky pre-commit always formats + re-stages                          |
| `feat/rv-03-rival-picks-hook`                 | 2026-05-13  | 51         | feat(features): useRivalPicks multi-entry hook (RV-03)                           |
| `feat/lf-ws-hardening`                        | 2026-05-13  | 51         | feat(worker): origin allowlist + per-DO connection cap on LiveGwDO               |
| `feat/interview-demo-collab-3d-pitch`         | 2026-05-13  | 51         | feat(interview-demo): captain voting layer                                       |
| `docs/sc-01-feasibility`                      | 2026-05-13  | 51         | docs(speed-comparison): confirm BR pricing + livefpl headers (feasibility)       |
| `chore/sync-main-into-dev`                    | 2026-05-13  | 51         | chore: sync main into dev (post #114 and LF-01/02/03 release)                    |
| `chore/gitflow-config`                        | 2026-05-13  | 51         | chore: GitFlow setup — CI runs on dev, release process docs                      |
| `fix/tamagui-ssr-option-a`                    | 2026-05-14  | 50         | fix(web): SSR Tamagui theme CSS via useServerInsertedHTML (Option A)             |
| `fix/duplicate-rivals-export`                 | 2026-05-14  | 50         | fix(features): drop duplicate `rivals` export in barrel                          |
| `feat/tamagui-ssr-option-b`                   | 2026-05-14  | 50         | chore(web): gitignore generated tamagui.css + ensure placeholder for dev         |
| `feat/rv-02-rivals-engine`                    | 2026-05-14  | 50         | Merge branch 'dev' into feat/rv-02-rivals-engine                                 |
| `feat/lp-02-cohort-engine`                    | 2026-05-14  | 50         | feat(worker): LP-02 cohort engine v0 — aggregation, fetch, scheduled handler     |
| `feat/livefpl-parity-foundation`              | 2026-05-14  | 50         | feat(web): per-player ownership % on pitch + livefpl-parity RFC (LP-01, LP-03)   |
| `feat/growth-pivot-flags`                     | 2026-05-14  | 50         | feat(web): growth-pivot launch scope behind feature flags                        |
| `feat/brand-mono-lockup`                      | 2026-05-14  | 50         | feat(brand): real-DM-Mono favicon via ImageResponse                              |
| `feat/bdd-test-coverage`                      | 2026-05-14  | 50         | feat(test): add BDD test framework (vitest-cucumber + playwright-bdd) and seed c |
| `docs/rv-01-fpl-league-paging`                | 2026-05-14  | 50         | Merge branch 'main' into docs/rv-01-fpl-league-paging                            |
| `docs/lf-01-gw36-findings`                    | 2026-05-14  | 50         | docs(lf-01): GW36 findings + analyzer + weekend soak wrapper                     |
| `docs/lf-01-followup-tweaks`                  | 2026-05-14  | 50         | docs(lf-01): apply GW36 cadences to RFC 001 + parameterise soak wrapper          |
| `chore/sync-main-into-dev-v2`                 | 2026-05-14  | 50         | chore: sync main into dev (post-#117 hardening + #118 SC-01 + #119 RV-01)        |
| `perf/lighthouse-cleanup`                     | 2026-05-15  | 49         | fix(test): update home-page title regex to match simply.fpl wordmark             |
| `hotfix/static-shell-edge-pages`              | 2026-05-15  | 49         | fix(web): static shells for /rank/[entryId] and /h2h/[a]/[b]                     |
| `fix/edge-runtime-h2h-rank`                   | 2026-05-15  | 49         | fix(web): add edge runtime to /rank/[entryId] and /h2h/[a]/[b]                   |
| `feat/uptime-monitoring`                      | 2026-05-15  | 49         | feat(worker): /status endpoint + web /status page for uptime monitoring          |
| `feat/tamagui-v2-migration`                   | 2026-05-15  | 49         | Merge origin/dev into feat/tamagui-v2-migration                                  |
| `feat/prod-crash-guardrail-visual-regression` | 2026-05-15  | 49         | feat(web): visual regression guardrail covering all prod routes                  |
| `feat/lf-04-live-snapshot-loop`               | 2026-05-15  | 49         | feat(worker): LF-04 live snapshot polling loop + broadcast                       |
| `feat/e2e-route-coverage`                     | 2026-05-15  | 49         | test(web): add e2e route coverage with browser-error listeners                   |
| `feat/cohort-engine-foundation`               | 2026-05-15  | 49         | Merge origin/dev into feat/cohort-engine-foundation                              |
| `chore/pr-conventions-claude-md`              | 2026-05-15  | 49         | docs(claude.md): PR opening convention — assign Pete + post status comment       |
| `chore/enable-cohort-cron`                    | 2026-05-15  | 49         | chore(worker): enable cohort cron triggers                                       |
| `hotfix/static-shell-not-found`               | 2026-05-16  | 48         | fix(web): static shell for not-found page (prod hotfix)                          |
| `hotfix/disable-tamagui-extraction`           | 2026-05-16  | 48         | fix(web): disable Tamagui v2 compiler extraction (prod hotfix)                   |
| `fix/skills-named-primitives`                 | 2026-05-16  | 48         | feat(ui): add pulse animation primitive + reference in SKILLS.md                 |
| `feat/ui-tightening`                          | 2026-05-16  | 48         | feat(web): UI tightening — drop Live Rank tab, compact stats, live clock         |
| `feat/ci-perf-budget`                         | 2026-05-16  | 48         | ci: add gzipped first-load JS budget check                                       |
| `docs/contributing-and-skills`                | 2026-05-16  | 48         | docs: add CONTRIBUTING.md and SKILLS.md                                          |
| `chore/sync-extraction-disable-into-dev`      | 2026-05-16  | 48         | fix(web): disable Tamagui v2 compiler extraction (prod hotfix)                   |
| `chore/saturday-soak-2026-05-16`              | 2026-05-16  | 48         | chore(soak): update notes with full 60-min run data (120 probes/target)          |
| `chore/release-workflows`                     | 2026-05-16  | 48         | fix(ci): add bddgen step to visual-regression workflow                           |
| `chore/hotfix-workflow-and-husky-refactor`    | 2026-05-16  | 48         | chore: /hotfix slash command + lint-staged pre-commit + pre-push format:check    |
| `chore/gitleaks-secrets-scan`                 | 2026-05-16  | 48         | fix(ci): grant gitleaks-action pull-requests: read permission                    |
| `perf/snapshot-endpoint-and-clock`            | 2026-05-17  | 47         | merge: dev into perf/snapshot-endpoint-and-clock                                 |
| `fix/e2e-mock-websocket`                      | 2026-05-18  | 46         | test(e2e): mock Worker WebSocket so /leagues + nav don't trigger console.error   |
| `fix/cloudflare-pages-font-error`             | 2026-05-18  | 46         | fix(web): add @tamagui/core + @tamagui/web as direct deps to unblock bundling    |
| `fix/bundle-budget-home-route`                | 2026-05-18  | 46         | fix(ci): raise / bundle budget to 165 kB + drop stale /rank entry                |
| `feat/speed-comparison-backend`               | 2026-05-18  | 46         | feat(worker): speed comparison backend (SC-02/03/04/05)                          |
| `feat/rivals-view-foundation`                 | 2026-05-18  | 46         | feat(web): rivals view foundation (RV-02/03/04/05)                               |
| `feat/rfc-005-replay-phase-a`                 | 2026-05-18  | 46         | feat(worker): RFC 005 Phase A — replay mode for LiveGwDO                         |
| `feat/live-rank-estimate-drop-rank-route`     | 2026-05-18  | 46         | feat(ci): workflow_dispatch to regenerate visual regression snapshots            |
| `ci/node24-deprecation`                       | 2026-05-18  | 46         | ci: bump JavaScript actions to Node 24 versions                                  |
| `chore/visual-regen-workflow`                 | 2026-05-18  | 46         | feat(ci): workflow_dispatch to regenerate visual regression snapshots            |
| `chore/sync-main-into-dev-v3`                 | 2026-05-18  | 46         | chore: sync main into dev — bring in not-found static shell hotfix               |
| `chore/apply-prettier-workflow`               | 2026-05-18  | 46         | feat(ci): workflow_dispatch to apply prettier on CI                              |
| `test/visual-regression-new-surfaces`         | 2026-05-19  | 45         | Merge remote-tracking branch 'origin/dev' into test/visual-regression-new-surfac |
| `perf/slim-prices-endpoint`                   | 2026-05-19  | 45         | Merge remote-tracking branch 'origin/dev' into perf/slim-prices-endpoint         |
| `fix/live-rank-header-mismatch`               | 2026-05-19  | 45         | Merge remote-tracking branch 'origin/dev' into fix/live-rank-header-mismatch     |
| `fix/e2e-mock-cohort-aggregates`              | 2026-05-19  | 45         | test(e2e): stub /cohorts/\* in worker mock so threats + EO specs pass CI         |
| `feat/threats-eo-scaffolds`                   | 2026-05-19  | 45         | fix(web): allow http://localhost:\* in CSP img-src for dev/CI kit images         |
| `feat/seo-and-payload-slim`                   | 2026-05-19  | 45         | Merge remote-tracking branch 'origin/dev' into feat/seo-and-payload-slim         |
| `feat/lf-observability-and-fallback-test`     | 2026-05-19  | 45         | feat(worker,web): LF-08 telemetry + LF-09 ws fallback smoke                      |
| `feat/home-unified-phase-4-cache`             | 2026-05-19  | 45         | fix(web): drop invalid extension-match Cache-Control rule                        |
| `feat/home-unified-phase-2`                   | 2026-05-19  | 45         | feat(web): mobile snap-scroll + above-the-fold live-rank for unified dashboard ( |
| `feat/home-unified-phase-2-rebased`           | 2026-05-19  | 45         | feat(web): mobile snap-scroll + above-the-fold live-rank for unified dashboard ( |
| `feat/home-unified-phase-1`                   | 2026-05-19  | 45         | Merge pull request #214 from pete-watters/feat/home-unified-phase-2              |
| `feat/gw38-dress-rehearsal`                   | 2026-05-19  | 45         | feat: GW38 dress rehearsal — cohort table + bonus prediction + autosubs          |
| `docs/tamagui-upstream-bug-draft`             | 2026-05-19  | 45         | docs(tamagui): add PR draft alongside the issue, link them together              |
| `chore/sync-main-into-dev-v5`                 | 2026-05-19  | 45         | Merge remote-tracking branch 'origin/main' into chore/sync-main-into-dev-v5      |
| `chore/sync-main-into-dev-v4`                 | 2026-05-19  | 45         | Merge remote-tracking branch 'origin/main' into chore/sync-main-into-dev-v4      |
| `fix/logo-home-link`                          | 2026-05-20  | 44         | fix(ui): link the nav logo home                                                  |
| `fix/live-rank-header-desync`                 | 2026-05-20  | 44         | fix(features,web): single source of truth for live-rank estimate                 |
| `fix/h2h-real-shirts`                         | 2026-05-20  | 44         | fix(features,web): render real team kits in head-to-head                         |
| `feat/rfc-005-ws4-full-stack-runner`          | 2026-05-20  | 44         | feat(web,worker): RFC 005 full-stack replay runner + e2e                         |
| `feat/phase-5-unified-home-default`           | 2026-05-20  | 44         | feat(web): phase 5 — unified dashboard is prod home, remove deprecated standal   |
| `feat/home-unified-rivals-picker`             | 2026-05-20  | 44         | feat(web): rivals league picker on unified dashboard (Phase 3)                   |
| `feat/home-unified-phase-3-hero`              | 2026-05-20  | 44         | feat(web): marketing hero for cold visitors on unified home (Phase 3)            |
| `feat/gw-recording-capture`                   | 2026-05-20  | 44         | feat(scripts): GW live-capture → ReplayRow JSONL recording (RFC 005 / WS1)       |
| `feat/cohort-serve-aggregates`                | 2026-05-20  | 44         | feat(worker): serve cohort aggregates at /cohorts/gw{N}/aggregates.json (cohort  |
| `feat/cohort-eo-and-table-slice-3`            | 2026-05-20  | 44         | feat(web,features): wire real cohort aggregates to EO and cohort comparison tabl |
| `feat/cohort-compute-from-aggregates`         | 2026-05-20  | 44         | feat(features,web): threats consume real cohort aggregates (cohort real-data sli |
| `docs/no-cross-project-references`            | 2026-05-20  | 44         | docs(claude.md): forbid cross-referencing other projects/clients in repo artifac |
| `chore/sync-main-into-dev-v6`                 | 2026-05-20  | 44         | Merge remote-tracking branch 'origin/main' into chore/sync-main-into-dev-v6      |
| `feat/worker-recording-capture`               | 2026-05-21  | 43         | feat(worker): tee live snapshots to R2 when capture is enabled (RFC 005)         |
| `feat/vibrant-stadium-redesign`               | 2026-05-21  | 43         | chore(test): regenerate visual regression snapshots [skip ci]                    |
| `feat/stadium-site-wide`                      | 2026-05-21  | 43         | chore(test): regenerate visual regression snapshots [skip ci]                    |
| `feat/stadium-content-accents`                | 2026-05-21  | 43         | feat(web): club-colour dots on price, threats and EO player lists                |
| `feat/stadium-club-colours`                   | 2026-05-21  | 43         | feat(web): club-colour dots on price, threats and EO player lists                |
| `feat/rfc-005-ws3-logic-harness`              | 2026-05-21  | 43         | Merge pull request #233 from pete-watters/feat/rfc-005-ws4-full-stack-runner     |
| `feat/rfc-005-ws2-recording-generator`        | 2026-05-21  | 43         | Merge pull request #230 from pete-watters/feat/rfc-005-ws3-logic-harness         |
| `feat/redesign-demos`                         | 2026-05-21  | 43         | feat(web): add home redesign demos (two-state bold, elevated quiet, vibrant stad |
| `docs/fpl-test-ids`                           | 2026-05-21  | 43         | docs: add FPL test entry/league IDs reference                                    |
| `docs/commit-authorship-rule`                 | 2026-05-21  | 43         | docs(claude.md): author all commits as Pete, incl. remote agents                 |
| `chore/season-archive-2025-26`                | 2026-05-21  | 43         | chore: add 2025/26 season archive data (gw1-37)                                  |
| `chore/recordings-r2-binding`                 | 2026-05-21  | 43         | Merge pull request #244 from pete-watters/feat/worker-recording-capture          |
| `fix/wordmark-deselect`                       | 2026-05-22  | 42         | feat(web): wordmark → simplyfpl.com, deselect team, OG consistency               |
| `fix/robustness-hardening`                    | 2026-05-22  | 42         | fix(web): graceful failure handling — global error boundary, bootstrap fallbac   |
| `feat/start-page-team-id-help`                | 2026-05-22  | 42         | feat(web): add team-ID explainer and brand mark to the start page                |
| `feat/brand-lockup-and-nav`                   | 2026-05-22  | 42         | feat(web): validate team ID exists before navigating                             |
| `chore/security-audit-2026-05-22`             | 2026-05-22  | 42         | chore(security): patch 6 vulnerabilities (turbo, uuid, ws)                       |
| `chore/season-runner`                         | 2026-05-22  | 42         | feat(scripts): offline season replay runner (RFC 005)                            |
| `stadium-254-takeover`                        | 2026-05-23  | 41         | fix(web): restore palette on dark surfaces + one consolidated status pill        |
| `fix/web-stale-tamagui-config-cache`          | 2026-05-23  | 41         | fix(web): clear stale Tamagui compiled config before dev and build               |
| `fix/lockfile-dompurify`                      | 2026-05-23  | 41         | chore: repair pnpm-lock.yaml (missing dompurify@3.4.5)                           |
| `fix/h2h-density`                             | 2026-05-23  | 41         | feat(web): tighten the head-to-head page                                         |
| `feat/theme-picker`                           | 2026-05-23  | 41         | perf(web): lazy-load home hero + live-rank section to clear bundle budget        |
| `feat/stadium-tokenize-and-polish`            | 2026-05-23  | 41         | Merge pull request #257 from pete-watters/feat/theme-picker                      |
| `feat/rfc-005-gw38-capture`                   | 2026-05-23  | 41         | feat(worker): capture gw38 live data to R2 for simulator (#173)                  |
| `feat/prelaunch-polish`                       | 2026-05-23  | 41         | test(web): regenerate visual snapshots for the dashboard + leagues changes       |
| `feat/mobile-vibrant-stadium`                 | 2026-05-23  | 41         | Merge branch 'dev' into feat/mobile-vibrant-stadium                              |
| `feat/e2e-simulator-replay`                   | 2026-05-23  | 41         | chore: update pnpm-lock.yaml after install                                       |
| `perf/web-tamagui-static-css`                 | 2026-05-24  | 40         | perf(web): serve Tamagui design-system CSS from a cacheable static file          |
| `perf/slim-computed-endpoints`                | 2026-05-24  | 40         | perf(worker,web): slim computed endpoints to cut payloads (#62)                  |
| `mock/football-pitch-hero`                    | 2026-05-24  | 40         | feat(web): football-pitch hero background                                        |
| `fix/web-logo-home-link`                      | 2026-05-24  | 40         | fix(ui): make the logo a working home link                                       |
| `fix/rivals-from-leagues`                     | 2026-05-24  | 40         | feat(web): link Rivals from /leagues + add /rivals/[leagueId] route              |
| `fix/nav-logo-test`                           | 2026-05-24  | 40         | fix(web): align nav-logo test with the render-prop anchor pattern                |
| `fix/nav-deselect-sync`                       | 2026-05-24  | 40         | fix(web): sync nav with saved team via a shared reactive entry-id source         |
| `fix/gw38-capture-cron`                       | 2026-05-24  | 40         | fix(worker): use Cloudflare-valid weekday (1=Sun) in gw38 capture cron           |
| `fix/cohort-top10k-sample-within-gw`          | 2026-05-24  | 40         | fix(worker): make cohort top_10k sampling complete within a gameweek             |
| `feat/web-top10k-ownership-toggle`            | 2026-05-24  | 40         | feat(web): add Top 10k ownership toggle to the live pitch                        |
| `feat/web-threats-playing-status`             | 2026-05-24  | 40         | feat(web): playing-status filters on Main Threats                                |
| `feat/web-brand-above-live-rank`              | 2026-05-24  | 40         | feat(web): SimplyFPL.com brand lockup above the live rank                        |
| `feat/scoreboard-rank-details`                | 2026-05-24  | 40         | feat(web): surface post-subs rank + change% on the live-rank scoreboard          |
| `feat/live-battle`                            | 2026-05-24  | 40         | Merge remote-tracking branch 'origin/dev' into feat/live-battle                  |
| `feat/ad-slot-scaffolding`                    | 2026-05-24  | 40         | feat(web): ad slot scaffolding behind NEXT_PUBLIC_FEATURE_ADS flag               |
| `chore/sync-main-v0-11-0`                     | 2026-05-24  | 40         | Merge remote-tracking branch 'origin/main' into chore/sync-main-v0-11-0          |
| `chore/pr-no-stacking-rule`                   | 2026-05-24  | 40         | docs: forbid stacked PRs — one larger PR off dev for shared work                 |
| `fix/mobile-orientation-polish`               | 2026-05-25  | 39         | test(web): guard mobile nav rank pill and Leagues in both orientations           |
| `feat/three-distinct-themes`                  | 2026-05-25  | 39         | Merge remote-tracking branch 'origin/dev' into feat/three-distinct-themes        |
| `feat/live-battle-bonus-polish`               | 2026-05-25  | 39         | feat(web): add pre/post autosubs toggle and clearer provisional bonus            |
| `docs/rfc-rank-accuracy`                      | 2026-05-25  | 39         | docs: RFC 006 — live-rank accuracy                                               |
| `chore/remove-eo-table`                       | 2026-05-25  | 39         | chore(web): remove the per-tier effective-ownership table                        |
| `chore/season-archive-2025-26-gw38`           | 2026-05-28  | 36         | chore(archive): always refresh cumulative artefacts to avoid cache staleness     |
| `fix/worker-fpl-passthrough-query-string`     | 2026-05-29  | 35         | fix(worker): preserve query string in /fpl/\* passthrough                        |
| `fix/orphan-step-unified-hero`                | 2026-06-02  | 31         | fix(tests): mock /fpl/bootstrap-static-slim in worker-mocks helper               |
| `feat/rank-accuracy-harness`                  | 2026-06-02  | 31         | fix(fpl-client): drop archive-reader from public barrel                          |
| `ci/auto-sync-main-into-dev`                  | 2026-06-02  | 31         | ci: auto-sync main into dev after a release tags                                 |
| `chore/cohort-score-distribution`             | 2026-06-02  | 31         | Merge remote-tracking branch 'origin/dev' into chore/cohort-score-distribution   |

To delete: `git push origin --delete <branch-name>` or use the GitHub UI → Branches.

## Deletion manifest (2026-07-06)

All 160 branches below were deleted after this report merged. Tips remain recoverable by SHA.

| Branch                                        | Tip SHA                                    | Merged into dev |
| --------------------------------------------- | ------------------------------------------ | --------------- |
| `fix/price-changes-threshold`                 | `f69de57c2f9a63474e01d8ea04f2a7302cbf5ad9` | unmerged        |
| `fix/leagues-uses-team-id`                    | `fe8cfa7e1e53e487206c2d0b3b3671c8eef1f41b` | unmerged        |
| `fix/input-styling`                           | `023c25c752522ac1471cb4c02a99359ad0e2771a` | unmerged        |
| `fix/home-auto-redirect-saved-team`           | `5228a9f5e32d99aec11d020ffc1242f580271a33` | unmerged        |
| `fix/ci-worker-deploy`                        | `d58fc32523faca9333de7733127424f0b46f6c27` | unmerged        |
| `fix/auth-callback-edge`                      | `a90558e9fd022c5f4f0d796517033dbcccf455ec` | unmerged        |
| `feat/tamagui-1.144-extraction-experiment`    | `f91209536a06e1a42d06baac87cd69a5989720fb` | unmerged        |
| `feat/profile-fpl-entry-id`                   | `e171591f60a66291a8361ca7a25ccf4d36228ed5` | unmerged        |
| `feat/planner-real-data-revival`              | `88743a7085fc382c89c8b288122741db3e61677f` | unmerged        |
| `feat/mvp-polish`                             | `e90c6cfed4d7ae2ea9835d1c56bef5a97a5dfa95` | unmerged        |
| `feat/live-rank-pill-header`                  | `bcdac4186c80f72178e10def28731d05aebcad19` | unmerged        |
| `feat/lf-02-do-scaffold`                      | `f92af1e01865d322b743e85ac30df900f9048a02` | unmerged        |
| `feat/lf-01-cadence-measurement`              | `5925731ee9735fc3301c6a4cf299c6bae8188595` | unmerged        |
| `feat/kit-proxy`                              | `e0306fd5018e6441d5aea46adba382c37299adf2` | unmerged        |
| `feat/head-to-head-comparison`                | `821fdf505023bb1b33ea88285c98ce51a9048305` | unmerged        |
| `feat/h2h-pitches-and-bench`                  | `aced9a3c992e092a8cb1fba15c3afc9a6267ba44` | unmerged        |
| `docs/competitive-rfcs`                       | `87d8328b0fbd508a2a90cadb66058ae231459bc9` | unmerged        |
| `spike/tamagui-ssr-research`                  | `dcd0e19cbbeda795fd200741d15d12eda45004ee` | merged          |
| `spike/next-16-upgrade`                       | `539f143a788ffa229788c315a88f16afbe81e729` | unmerged        |
| `research/sc-01-speed-comp-feasibility`       | `100875b8f7719b5de090bbef3823fcc49b30dde8` | unmerged        |
| `research/rv-01-league-paging`                | `99f2bf791bc3635611cb27bac2bc55c00099d480` | unmerged        |
| `fix/leagues-ui-quick-wins`                   | `6aff66aef2002448cd4ddee74a1b1e5506639ca6` | merged          |
| `fix/husky-format-restage`                    | `5ddea1efa2933ac5a54ae123e6c5cb7550b9dfbf` | merged          |
| `feat/rv-03-rival-picks-hook`                 | `f34e8e4a0b072a3a88f65099f56a08d225f603cb` | merged          |
| `feat/lf-ws-hardening`                        | `c2b4e6c77ebf87e048966f834128b0f96878dda5` | merged          |
| `feat/interview-demo-collab-3d-pitch`         | `1ca4327474ee0fc00926463b9393ca3716ea3fd9` | unmerged        |
| `docs/sc-01-feasibility`                      | `22830d48bfd0f1883d371c275175cba78ede488f` | merged          |
| `chore/sync-main-into-dev`                    | `938f798970d7cd07f87e9f9a6f5258f63ae992f6` | merged          |
| `chore/gitflow-config`                        | `f052d2d15bf1a9b04d6d2031fb350c1451149a89` | merged          |
| `fix/tamagui-ssr-option-a`                    | `eb2137ba14732e2bb90c78a9c7a4091b7d6f1ade` | merged          |
| `fix/duplicate-rivals-export`                 | `8777c769d7662ab7f30be808d607bbb34c3febca` | merged          |
| `feat/tamagui-ssr-option-b`                   | `00144f0132809976fbb894c105d930d295d32df5` | merged          |
| `feat/rv-02-rivals-engine`                    | `27de480d9e772ed313f24d0f85512906b0b66d19` | merged          |
| `feat/lp-02-cohort-engine`                    | `86472ebc9c450b6a6f038399a8dbc86349d4c506` | unmerged        |
| `feat/livefpl-parity-foundation`              | `ae266fe1879dae4263872def8576bf159362ed04` | merged          |
| `feat/growth-pivot-flags`                     | `4b5015c248f0f314ee6b0e1ffe4a10da61439348` | merged          |
| `feat/brand-mono-lockup`                      | `2991db8c32e4446624cfe20093013f28920a0fc1` | merged          |
| `feat/bdd-test-coverage`                      | `f2467929b29293df7767f41982ad8de5f21ad3f8` | merged          |
| `docs/rv-01-fpl-league-paging`                | `a1a1970e3f38a61e34dbf54c181adc1903a4a3a7` | merged          |
| `docs/lf-01-gw36-findings`                    | `881714fe91edf859138473309e151bdb14addcb1` | merged          |
| `docs/lf-01-followup-tweaks`                  | `d913143827ae79fa109b06d74097763ad693b56a` | merged          |
| `chore/sync-main-into-dev-v2`                 | `52ba4d25300e24ec88635465fd4b7734cfe5b766` | merged          |
| `perf/lighthouse-cleanup`                     | `4bf7334a6e867a0faa036bf7d8f6774375a09bd1` | merged          |
| `hotfix/static-shell-edge-pages`              | `738ef45eb9f7e02d07de7811b8cd533319af1af2` | merged          |
| `fix/edge-runtime-h2h-rank`                   | `2d32fde98228a50ee8c844511d97607bf321bf50` | merged          |
| `feat/uptime-monitoring`                      | `a4605744985ea20f1158d819e6af862849843a0b` | merged          |
| `feat/tamagui-v2-migration`                   | `31542474fefcb2d6851dca4d6516e1dee03c6300` | merged          |
| `feat/prod-crash-guardrail-visual-regression` | `8e5e3bc0415969a81c9118f6ae995cfb7278b08b` | merged          |
| `feat/lf-04-live-snapshot-loop`               | `f502f864e981251ef277ac1728846de8825e3235` | merged          |
| `feat/e2e-route-coverage`                     | `ef6a91e5d2f159a3a7204f9c00a0da53f197191c` | merged          |
| `feat/cohort-engine-foundation`               | `adc8b5b1da796c05ca934c6f47121b4d8043459b` | merged          |
| `chore/pr-conventions-claude-md`              | `3d2d82761128b59fd27a0ae01395ae863165a396` | merged          |
| `chore/enable-cohort-cron`                    | `0ec97ad837bb7a83b7cfe68a0fb7e684f4102770` | merged          |
| `hotfix/static-shell-not-found`               | `bc13c448c84565e4614e83825ae1db7956cc2a82` | unmerged        |
| `hotfix/disable-tamagui-extraction`           | `ce2dc4cb07be39b7de24080b8b26249be234f897` | merged          |
| `fix/skills-named-primitives`                 | `77b12836c140b9e8f051b1e7ef32f5959cbd2886` | merged          |
| `feat/ui-tightening`                          | `4bbcbf0ef41a835d43853b6e533c47cf326eb92c` | merged          |
| `feat/ci-perf-budget`                         | `f87d6bfc6eeb6315991cb334c1385c4785a5e2ff` | merged          |
| `docs/contributing-and-skills`                | `555f4f0fcbed9294605723586714e43c72a7a6cc` | unmerged        |
| `chore/sync-extraction-disable-into-dev`      | `13b7ee930c4131f495744846c00ddc80bf3b4d5c` | merged          |
| `chore/saturday-soak-2026-05-16`              | `6d3fc13bb41c55d3af3b6fb4bd84fa0fa38f2859` | merged          |
| `chore/release-workflows`                     | `a70f885bf50648ac132f302de020c25bd58dc45b` | merged          |
| `chore/hotfix-workflow-and-husky-refactor`    | `bd1dce79b2d8f53d8bf15b2ba8a805007fe0e015` | merged          |
| `chore/gitleaks-secrets-scan`                 | `7c8a8c3e247da1eb56fad5aa71ebaa328763599a` | merged          |
| `perf/snapshot-endpoint-and-clock`            | `7829a7cb544e97395f817984afbd2c301535d30e` | merged          |
| `fix/e2e-mock-websocket`                      | `4d2d915111d41b399ce506de14099361157d715f` | merged          |
| `fix/cloudflare-pages-font-error`             | `1b0f740d38dfacaf5393819564f9b0175ff2efe5` | merged          |
| `fix/bundle-budget-home-route`                | `ffb81d9ae41b6470a2bedaac96ef687594030993` | merged          |
| `feat/speed-comparison-backend`               | `9d6b11e094541b4f75642cdea5fb62c07b86ae22` | merged          |
| `feat/rivals-view-foundation`                 | `686a2d90afa47a3ad9507e12b47dce931849a31a` | merged          |
| `feat/rfc-005-replay-phase-a`                 | `8459f9060504c7510ba5623831fc5ff4b54843dc` | unmerged        |
| `feat/live-rank-estimate-drop-rank-route`     | `e98f92e8f5fdd1a4a6cb11e98c404730e8eec694` | merged          |
| `ci/node24-deprecation`                       | `e0fc35bf8136dc26546a89dccf7ec7c4841cf081` | unmerged        |
| `chore/visual-regen-workflow`                 | `e4c0235e5be12b6d3dd35a8bcd3785796171e161` | merged          |
| `chore/sync-main-into-dev-v3`                 | `3cb69baa388a40b00ab5e7b16bffe6e080efa885` | merged          |
| `chore/apply-prettier-workflow`               | `d36b30dad6d63f0594f8a3a663bf6fe5f77fd631` | merged          |
| `test/visual-regression-new-surfaces`         | `8844e08bc8e27d30d05d51fbed6aa2ed602afdc6` | merged          |
| `perf/slim-prices-endpoint`                   | `fb0694cf9812ed4dffcbe0b5cbace195e52e14ba` | merged          |
| `fix/live-rank-header-mismatch`               | `50cf3f83238b49d7de42b2f24a81ad5a76cb2639` | merged          |
| `fix/e2e-mock-cohort-aggregates`              | `9adcb4e98a6be3df513e5cd0af31e69d71deb9d4` | merged          |
| `feat/threats-eo-scaffolds`                   | `f350dc8ca81b87560ef8dea7267538847e865395` | merged          |
| `feat/seo-and-payload-slim`                   | `a4209daaf28e5bb8408b31616908e53fe8a5f18d` | merged          |
| `feat/lf-observability-and-fallback-test`     | `9da65c388435dc5935490e0f9d4ded784eae4d98` | merged          |
| `feat/home-unified-phase-4-cache`             | `582ec933cec70fd31e8e8786c15df247c4b3b7a5` | merged          |
| `feat/home-unified-phase-2`                   | `7636349c42163dd3a468ca301eff584934f957ff` | unmerged        |
| `feat/home-unified-phase-2-rebased`           | `14f9cd0cf2221f475cb30534b887158dd2c28034` | merged          |
| `feat/home-unified-phase-1`                   | `e2af3b9fed10de9acd9a0400f79df9cf4c01a856` | unmerged        |
| `feat/gw38-dress-rehearsal`                   | `d1cfb48b67082e10c3f6e89f62f697643dd6233f` | merged          |
| `docs/tamagui-upstream-bug-draft`             | `78201fbf50273992da6c5540d5a69e612afa6e97` | unmerged        |
| `chore/sync-main-into-dev-v5`                 | `7015c62e3209161ed84ea0dcf4ecc26598439e2f` | merged          |
| `chore/sync-main-into-dev-v4`                 | `bd93db35b4309e414779d86dc2c846944610c614` | merged          |
| `fix/logo-home-link`                          | `7211d429f1e877fa4819936056c700e51b276d71` | merged          |
| `fix/live-rank-header-desync`                 | `008f96c4a17a5ebc94f2b8e9eb063441a9fb7815` | merged          |
| `fix/h2h-real-shirts`                         | `7a63a90dfd060f685998c242315c9ecbdc6d9dd0` | merged          |
| `feat/rfc-005-ws4-full-stack-runner`          | `5f6cec5532a436372c2e0c428076a107aaef30bf` | unmerged        |
| `feat/phase-5-unified-home-default`           | `31b21eeaa161481366e3fc590c5a9b728403bda8` | merged          |
| `feat/home-unified-rivals-picker`             | `418455d0bbe35d2e455b9f673f07da0cee86ce4a` | merged          |
| `feat/home-unified-phase-3-hero`              | `2f2b04437bc43bb102543eaa4d391a17ff5fac61` | merged          |
| `feat/gw-recording-capture`                   | `3b0a9eaa590ac6e76f1ebbebc08d6558df61d272` | merged          |
| `feat/cohort-serve-aggregates`                | `4d98fe52e15f0d4a18e6dbdb28f00ebf7302be12` | merged          |
| `feat/cohort-eo-and-table-slice-3`            | `67799461b385ea8e2032690d1a8afe90c50b4d98` | merged          |
| `feat/cohort-compute-from-aggregates`         | `e892585e8ec8ea5a5fef2671ef859c15cbe9ec30` | merged          |
| `docs/no-cross-project-references`            | `ec4d64931866cd1298dbbe6ca0737e8653c7d190` | merged          |
| `chore/sync-main-into-dev-v6`                 | `b8d0bf8bb7b3b29b738470580b1d66af02f43e9a` | merged          |
| `feat/worker-recording-capture`               | `6f743127251b0ad7dc944bbcb72ebb88b4374586` | unmerged        |
| `feat/vibrant-stadium-redesign`               | `50b78326c2cfee2fc647bd1e03a94c3518e31683` | merged          |
| `feat/stadium-site-wide`                      | `1997ee79c08d11f7e7f22ab7b659b4259174da16` | merged          |
| `feat/stadium-content-accents`                | `fcdbab84a34aed4e51be0f446cefbbca7e15552d` | merged          |
| `feat/stadium-club-colours`                   | `fcdbab84a34aed4e51be0f446cefbbca7e15552d` | merged          |
| `feat/rfc-005-ws3-logic-harness`              | `30821cd94862c726b9959e31be53359f94b0e5cd` | unmerged        |
| `feat/rfc-005-ws2-recording-generator`        | `e8690cbb0ed271378bc1a4802ba0c5ede1d76d8a` | unmerged        |
| `feat/redesign-demos`                         | `7867d8104b708513507afc4c932486d757def652` | unmerged        |
| `docs/fpl-test-ids`                           | `491537ae3bcee58dcc88ef8c656bd42458836ca3` | merged          |
| `docs/commit-authorship-rule`                 | `32fb7b7e8a1d7b943e57dadef1a0a0c7f3083611` | merged          |
| `chore/season-archive-2025-26`                | `4ae032bef4a3157975a649afeb95890450ddce4c` | merged          |
| `chore/recordings-r2-binding`                 | `2712c6571c33de9a326232c4cb101a859acdb2a5` | unmerged        |
| `fix/wordmark-deselect`                       | `c3e4050d9dbb4ef978f8d69fa92993fc4b9c8b38` | merged          |
| `fix/robustness-hardening`                    | `c30c2b62918f759d7190799abcc7790e082e0a65` | merged          |
| `feat/start-page-team-id-help`                | `79c0658dcdebcf9d858bd68a5ec788fd7b3b2a11` | merged          |
| `feat/brand-lockup-and-nav`                   | `2936f693e867bc90c540ac94ee6b6846866d53a9` | merged          |
| `chore/security-audit-2026-05-22`             | `9c0264068501636060b8425752b95754b24d52eb` | merged          |
| `chore/season-runner`                         | `870564bd3c2bc61b8b8ccac5b8e449e47b5997a5` | unmerged        |
| `stadium-254-takeover`                        | `aa9e90dd9403c4708bf65f91ded1f46d7f60f52d` | unmerged        |
| `fix/web-stale-tamagui-config-cache`          | `f9724a4210a5edd6ea74b4d4a70711a24305d1fa` | merged          |
| `fix/lockfile-dompurify`                      | `dd520fb82ef9b7c1b3c5ac06da810a69214b102a` | merged          |
| `fix/h2h-density`                             | `f3e436babaa0e38124b8921c6cf1511e8a436955` | merged          |
| `feat/theme-picker`                           | `183ee67557596b001a9a019b9f39740e3e757036` | unmerged        |
| `feat/stadium-tokenize-and-polish`            | `e3d4632833262e073342ed8e6ceaf58ac376414d` | unmerged        |
| `feat/rfc-005-gw38-capture`                   | `39c3a1661d023880868aaa3dfb0834f700aba1fb` | merged          |
| `feat/prelaunch-polish`                       | `96b055cd702b547b78270748700914a6df960824` | merged          |
| `feat/mobile-vibrant-stadium`                 | `906edcca4b61863524b29a472066525d36b9a90f` | merged          |
| `feat/e2e-simulator-replay`                   | `03b8af13fde27c3361756f54a8966c2e9e251318` | merged          |
| `perf/web-tamagui-static-css`                 | `6ce86805b95af96a9665a6989f46711253eaf816` | merged          |
| `perf/slim-computed-endpoints`                | `d6b437f1e294e9bad01c826e9f47fecc11cfbb85` | merged          |
| `mock/football-pitch-hero`                    | `06d55e0ca0e9ab0e22b77aa996a2e8918c29566e` | merged          |
| `fix/web-logo-home-link`                      | `2bd243a961b136512350f3e7191fa6459606fd65` | merged          |
| `fix/rivals-from-leagues`                     | `790cd71f9781bd7c47e78727e458a46f1e8ed508` | merged          |
| `fix/nav-logo-test`                           | `e5f73df4d54ea5c1a900a838a3aa855b301262e2` | merged          |
| `fix/nav-deselect-sync`                       | `6f06765e4c4ba741416158504955782c2f1588ef` | merged          |
| `fix/gw38-capture-cron`                       | `4ddf23d45b12eed1724c0454611fe0f4008553a8` | merged          |
| `fix/cohort-top10k-sample-within-gw`          | `986557302036afe3ad7d09f010abf2478f75400a` | merged          |
| `feat/web-top10k-ownership-toggle`            | `92ec7557a30a1da7895e02f495b9b12f78e38e3c` | merged          |
| `feat/web-threats-playing-status`             | `c0386dc3c80e1677d5680e6bc32dda60762a59ca` | merged          |
| `feat/web-brand-above-live-rank`              | `fe413b396b9a94137f158a53380e8b47577a6c4c` | merged          |
| `feat/scoreboard-rank-details`                | `e8f0f19c849e7924ab200873654fcc33e3765288` | merged          |
| `feat/live-battle`                            | `2421fe6539d390bbf96ea91cd237fe09d99b0197` | merged          |
| `feat/ad-slot-scaffolding`                    | `518c6b85e559697834d139449663ad30493cf414` | merged          |
| `chore/sync-main-v0-11-0`                     | `98603a6127dd815b15161109b268bfb31da80b4b` | merged          |
| `chore/pr-no-stacking-rule`                   | `14c290cb478c5987b9f02241a216222d910882a6` | merged          |
| `fix/mobile-orientation-polish`               | `92dd8eba7d37d1392df3712c5bbd27cd9f914dc6` | merged          |
| `feat/three-distinct-themes`                  | `55aa2a599c66e113509c69bbf29d5cd904455fb2` | unmerged        |
| `feat/live-battle-bonus-polish`               | `ae525cb5516d898f27a61af192b992a1e1c8a2c9` | merged          |
| `docs/rfc-rank-accuracy`                      | `4df396b9c53eff26ec92fe40a3d8b9567f3fb89b` | merged          |
| `chore/remove-eo-table`                       | `7e76cdcc0aa3d102a3a9029c08e5ea5ff84357ae` | merged          |
| `chore/season-archive-2025-26-gw38`           | `5d51f446188a92271ce863cee7bf72bf1fe51ebb` | merged          |
| `fix/worker-fpl-passthrough-query-string`     | `d4f01be36e24e96cb4a7a68bbc4824b63a604f26` | merged          |
| `fix/orphan-step-unified-hero`                | `ea71f4582b914dc6d1f543a2dda46b23ddbe96a4` | merged          |
| `feat/rank-accuracy-harness`                  | `541b7f1d90b882720d1386859e1b6cfe713387eb` | merged          |
| `ci/auto-sync-main-into-dev`                  | `5967e418ffb50b51cc73f75c57bd5df6f0ecd955` | merged          |
| `chore/cohort-score-distribution`             | `d112b00f7a399eff474ff86f0f2848ec6112a2cc` | merged          |
