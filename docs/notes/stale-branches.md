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
