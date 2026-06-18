# Stale Branch Report

**Run date (UTC):** 2026-06-18

**Total stale branches:** 75 (no push in 30+ days, no open PR)

| Branch                                        | Last-commit date | Age (days) | Last-commit subject                                                                     |
| --------------------------------------------- | ---------------- | ---------- | --------------------------------------------------------------------------------------- |
| `fix/price-changes-threshold`                 | 2026-05-12       | 36         | Merge remote-tracking branch 'origin/dev' into fix/price-changes-threshold              |
| `fix/leagues-uses-team-id`                    | 2026-05-12       | 36         | fix(web): unify leagues view across auth states                                         |
| `fix/input-styling`                           | 2026-05-12       | 36         | chore: prettier                                                                         |
| `fix/home-auto-redirect-saved-team`           | 2026-05-12       | 36         | fix(web): auto-redirect home to /rank/[id] when team ID is saved                        |
| `fix/ci-worker-deploy`                        | 2026-05-12       | 36         | fix(ci): worker deploy uses 'run deploy' to disambiguate from pnpm subcommand           |
| `fix/auth-callback-edge`                      | 2026-05-12       | 36         | fix(web): edge runtime on /auth/callback for Cloudflare Pages                           |
| `feat/tamagui-1.144-extraction-experiment`    | 2026-05-12       | 36         | wip: tamagui 1.144 ssr extraction experiment                                            |
| `feat/profile-fpl-entry-id`                   | 2026-05-12       | 36         | feat(auth): sync FPL entry ID between localStorage and profiles                         |
| `feat/planner-real-data-revival`              | 2026-05-12       | 36         | feat(web): real-data transfer planner (free tier)                                       |
| `feat/mvp-polish`                             | 2026-05-12       | 36         | docs: note husky pre-commit format gotcha in CLAUDE.md                                  |
| `feat/live-rank-pill-header`                  | 2026-05-12       | 36         | fix(web): wrap HomeSearchView in Suspense for static prerender                          |
| `feat/lf-02-do-scaffold`                      | 2026-05-12       | 36         | feat(worker): LiveGwDO scaffolding + /live/ws upgrade route (LF-02, LF-03)              |
| `feat/lf-01-cadence-measurement`              | 2026-05-12       | 36         | feat(scripts): FPL /event/live cadence measurement (LF-01)                              |
| `feat/kit-proxy`                              | 2026-05-12       | 36         | refactor(worker): share FPL host across API + CDN origins                               |
| `feat/head-to-head-comparison`                | 2026-05-12       | 36         | feat(web): side-by-side pitches + bench in h2h view                                     |
| `feat/h2h-pitches-and-bench`                  | 2026-05-12       | 36         | fix(web): wrap HomeSearchView in Suspense for static prerender                          |
| `docs/competitive-rfcs`                       | 2026-05-12       | 36         | docs: RFCs + issue checklists for competitive workstreams                               |
| `spike/tamagui-ssr-research`                  | 2026-05-13       | 35         | docs(notes): Tamagui SSR feasibility spike                                              |
| `spike/next-16-upgrade`                       | 2026-05-13       | 35         | docs(notes): Next.js 16 upgrade spike                                                   |
| `research/sc-01-speed-comp-feasibility`       | 2026-05-13       | 35         | docs(notes): SC-01 speed-comparison feasibility                                         |
| `research/rv-01-league-paging`                | 2026-05-13       | 35         | docs(notes): RV-01 league paging behaviour                                              |
| `fix/leagues-ui-quick-wins`                   | 2026-05-13       | 35         | chore: prettier                                                                         |
| `fix/husky-format-restage`                    | 2026-05-13       | 35         | fix(infra): husky pre-commit always formats + re-stages                                 |
| `feat/rv-03-rival-picks-hook`                 | 2026-05-13       | 35         | feat(features): useRivalPicks multi-entry hook (RV-03)                                  |
| `feat/lf-ws-hardening`                        | 2026-05-13       | 35         | feat(worker): origin allowlist + per-DO connection cap on LiveGwDO                      |
| `feat/interview-demo-collab-3d-pitch`         | 2026-05-13       | 35         | feat(interview-demo): captain voting layer                                              |
| `docs/sc-01-feasibility`                      | 2026-05-13       | 35         | docs(speed-comparison): confirm BR pricing + livefpl headers (feasibility)              |
| `chore/sync-main-into-dev`                    | 2026-05-13       | 35         | chore: sync main into dev (post #114 and LF-01/02/03 release)                           |
| `chore/gitflow-config`                        | 2026-05-13       | 35         | chore: GitFlow setup — CI runs on dev, release process docs                             |
| `fix/tamagui-ssr-option-a`                    | 2026-05-14       | 34         | fix(web): SSR Tamagui theme CSS via useServerInsertedHTML (Option A)                    |
| `fix/duplicate-rivals-export`                 | 2026-05-14       | 34         | fix(features): drop duplicate \`rivals\` export in barrel                               |
| `feat/tamagui-ssr-option-b`                   | 2026-05-14       | 34         | chore(web): gitignore generated tamagui.css + ensure placeholder for dev                |
| `feat/rv-02-rivals-engine`                    | 2026-05-14       | 34         | Merge branch 'dev' into feat/rv-02-rivals-engine                                        |
| `feat/lp-02-cohort-engine`                    | 2026-05-14       | 34         | feat(worker): LP-02 cohort engine v0 — aggregation, fetch, scheduled handler            |
| `feat/livefpl-parity-foundation`              | 2026-05-14       | 34         | feat(web): per-player ownership % on pitch + livefpl-parity RFC (LP-01, LP-03)          |
| `feat/growth-pivot-flags`                     | 2026-05-14       | 34         | feat(web): growth-pivot launch scope behind feature flags                               |
| `feat/brand-mono-lockup`                      | 2026-05-14       | 34         | feat(brand): real-DM-Mono favicon via ImageResponse                                     |
| `feat/bdd-test-coverage`                      | 2026-05-14       | 34         | feat(test): add BDD test framework (vitest-cucumber + playwright-bdd) and seed coverage |
| `docs/rv-01-fpl-league-paging`                | 2026-05-14       | 34         | Merge branch 'main' into docs/rv-01-fpl-league-paging                                   |
| `docs/lf-01-gw36-findings`                    | 2026-05-14       | 34         | docs(lf-01): GW36 findings + analyzer + weekend soak wrapper                            |
| `docs/lf-01-followup-tweaks`                  | 2026-05-14       | 34         | docs(lf-01): apply GW36 cadences to RFC 001 + parameterise soak wrapper                 |
| `chore/sync-main-into-dev-v2`                 | 2026-05-14       | 34         | chore: sync main into dev (post-#117 hardening + #118 SC-01 + #119 RV-01)               |
| `perf/lighthouse-cleanup`                     | 2026-05-15       | 33         | fix(test): update home-page title regex to match simply.fpl wordmark                    |
| `hotfix/static-shell-edge-pages`              | 2026-05-15       | 33         | fix(web): static shells for /rank/[entryId] and /h2h/[a]/[b]                            |
| `fix/edge-runtime-h2h-rank`                   | 2026-05-15       | 33         | fix(web): add edge runtime to /rank/[entryId] and /h2h/[a]/[b]                          |
| `feat/uptime-monitoring`                      | 2026-05-15       | 33         | feat(worker): /status endpoint + web /status page for uptime monitoring                 |
| `feat/tamagui-v2-migration`                   | 2026-05-15       | 33         | Merge origin/dev into feat/tamagui-v2-migration                                         |
| `feat/prod-crash-guardrail-visual-regression` | 2026-05-15       | 33         | feat(web): visual regression guardrail covering all prod routes                         |
| `feat/lf-04-live-snapshot-loop`               | 2026-05-15       | 33         | feat(worker): LF-04 live snapshot polling loop + broadcast                              |
| `feat/e2e-route-coverage`                     | 2026-05-15       | 33         | test(web): add e2e route coverage with browser-error listeners                          |
| `feat/cohort-engine-foundation`               | 2026-05-15       | 33         | Merge origin/dev into feat/cohort-engine-foundation                                     |
| `chore/pr-conventions-claude-md`              | 2026-05-15       | 33         | docs(claude.md): PR opening convention — assign Pete + post status comment              |
| `chore/enable-cohort-cron`                    | 2026-05-15       | 33         | chore(worker): enable cohort cron triggers                                              |
| `hotfix/static-shell-not-found`               | 2026-05-16       | 32         | fix(web): static shell for not-found page (prod hotfix)                                 |
| `hotfix/disable-tamagui-extraction`           | 2026-05-16       | 32         | fix(web): disable Tamagui v2 compiler extraction (prod hotfix)                          |
| `fix/skills-named-primitives`                 | 2026-05-16       | 32         | feat(ui): add pulse animation primitive + reference in SKILLS.md                        |
| `feat/ui-tightening`                          | 2026-05-16       | 32         | feat(web): UI tightening — drop Live Rank tab, compact stats, live clock                |
| `feat/ci-perf-budget`                         | 2026-05-16       | 32         | ci: add gzipped first-load JS budget check                                              |
| `docs/contributing-and-skills`                | 2026-05-16       | 32         | docs: add CONTRIBUTING.md and SKILLS.md                                                 |
| `chore/sync-extraction-disable-into-dev`      | 2026-05-16       | 32         | fix(web): disable Tamagui v2 compiler extraction (prod hotfix)                          |
| `chore/saturday-soak-2026-05-16`              | 2026-05-16       | 32         | chore(soak): update notes with full 60-min run data (120 probes/target)                 |
| `chore/release-workflows`                     | 2026-05-16       | 32         | fix(ci): add bddgen step to visual-regression workflow                                  |
| `chore/hotfix-workflow-and-husky-refactor`    | 2026-05-16       | 32         | chore: /hotfix slash command + lint-staged pre-commit + pre-push format:check           |
| `chore/gitleaks-secrets-scan`                 | 2026-05-16       | 32         | fix(ci): grant gitleaks-action pull-requests: read permission                           |
| `perf/snapshot-endpoint-and-clock`            | 2026-05-17       | 31         | merge: dev into perf/snapshot-endpoint-and-clock                                        |
| `fix/e2e-mock-websocket`                      | 2026-05-18       | 30         | test(e2e): mock Worker WebSocket so /leagues + nav don't trigger console.error          |
| `fix/cloudflare-pages-font-error`             | 2026-05-18       | 30         | fix(web): add @tamagui/core + @tamagui/web as direct deps to unblock bundling           |
| `fix/bundle-budget-home-route`                | 2026-05-18       | 30         | fix(ci): raise / bundle budget to 165 kB + drop stale /rank entry                       |
| `feat/speed-comparison-backend`               | 2026-05-18       | 30         | feat(worker): speed comparison backend (SC-02/03/04/05)                                 |
| `feat/rivals-view-foundation`                 | 2026-05-18       | 30         | feat(web): rivals view foundation (RV-02/03/04/05)                                      |
| `feat/rfc-005-replay-phase-a`                 | 2026-05-18       | 30         | feat(worker): RFC 005 Phase A — replay mode for LiveGwDO                                |
| `feat/live-rank-estimate-drop-rank-route`     | 2026-05-18       | 30         | feat(ci): workflow_dispatch to regenerate visual regression snapshots                   |
| `feat/lf-observability-and-fallback-test`     | 2026-05-19       | 30         | feat(worker,web): LF-08 telemetry + LF-09 ws fallback smoke                             |
| `feat/gw38-dress-rehearsal`                   | 2026-05-19       | 30         | feat: GW38 dress rehearsal — cohort table + bonus prediction + autosubs                 |
| `ci/node24-deprecation`                       | 2026-05-18       | 30         | ci: bump JavaScript actions to Node 24 versions                                         |
| `chore/visual-regen-workflow`                 | 2026-05-18       | 30         | feat(ci): workflow_dispatch to regenerate visual regression snapshots                   |
| `chore/sync-main-into-dev-v3`                 | 2026-05-18       | 30         | chore: sync main into dev — bring in not-found static shell hotfix                      |
| `chore/apply-prettier-workflow`               | 2026-05-18       | 30         | feat(ci): workflow_dispatch to apply prettier on CI                                     |

To delete: `git push origin --delete <branch-name>` or use the GitHub UI → Branches.
