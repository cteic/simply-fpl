# Stale Branch Report

**Run date (UTC):** 2026-07-18

**Total stale branches:** 77

Branches that have not been pushed to in 30+ days and have no open PR.

| Branch                                     | Last commit | Age (days) | Last commit subject                                                              |
| ------------------------------------------ | ----------- | ---------- | -------------------------------------------------------------------------------- |
| `fix/price-changes-threshold`              | 2026-05-12  | 66         | Merge remote-tracking branch 'origin/dev' into fix/price-changes-threshold       |
| `fix/leagues-uses-team-id`                 | 2026-05-12  | 66         | fix(web): unify leagues view across auth states                                  |
| `fix/input-styling`                        | 2026-05-12  | 66         | chore: prettier                                                                  |
| `fix/home-auto-redirect-saved-team`        | 2026-05-12  | 66         | fix(web): auto-redirect home to /rank/[id] when team ID is saved                 |
| `fix/ci-worker-deploy`                     | 2026-05-12  | 66         | fix(ci): worker deploy uses 'run deploy' to disambiguate from pnpm subcommand    |
| `fix/auth-callback-edge`                   | 2026-05-12  | 66         | fix(web): edge runtime on /auth/callback for Cloudflare Pages                    |
| `feat/tamagui-1.144-extraction-experiment` | 2026-05-12  | 66         | wip: tamagui 1.144 ssr extraction experiment                                     |
| `feat/profile-fpl-entry-id`                | 2026-05-12  | 66         | feat(auth): sync FPL entry ID between localStorage and profiles                  |
| `feat/planner-real-data-revival`           | 2026-05-12  | 66         | feat(web): real-data transfer planner (free tier)                                |
| `feat/mvp-polish`                          | 2026-05-12  | 66         | docs: note husky pre-commit format gotcha in CLAUDE.md                           |
| `feat/live-rank-pill-header`               | 2026-05-12  | 66         | fix(web): wrap HomeSearchView in Suspense for static prerender                   |
| `feat/lf-02-do-scaffold`                   | 2026-05-12  | 66         | feat(worker): LiveGwDO scaffolding + /live/ws upgrade route (LF-02, LF-03)       |
| `feat/lf-01-cadence-measurement`           | 2026-05-12  | 66         | feat(scripts): FPL /event/live cadence measurement (LF-01)                       |
| `feat/kit-proxy`                           | 2026-05-12  | 66         | refactor(worker): share FPL host across API + CDN origins                        |
| `feat/head-to-head-comparison`             | 2026-05-12  | 66         | feat(web): side-by-side pitches + bench in h2h view                              |
| `feat/h2h-pitches-and-bench`               | 2026-05-12  | 66         | fix(web): wrap HomeSearchView in Suspense for static prerender                   |
| `docs/competitive-rfcs`                    | 2026-05-12  | 66         | docs: RFCs + issue checklists for competitive workstreams                        |
| `spike/next-16-upgrade`                    | 2026-05-13  | 65         | docs(notes): Next.js 16 upgrade spike                                            |
| `research/sc-01-speed-comp-feasibility`    | 2026-05-13  | 65         | docs(notes): SC-01 speed-comparison feasibility                                  |
| `research/rv-01-league-paging`             | 2026-05-13  | 65         | docs(notes): RV-01 league paging behaviour                                       |
| `feat/interview-demo-collab-3d-pitch`      | 2026-05-13  | 65         | feat(interview-demo): captain voting layer                                       |
| `feat/lp-02-cohort-engine`                 | 2026-05-14  | 64         | feat(worker): LP-02 cohort engine v0 — aggregation, fetch, scheduled handler     |
| `hotfix/static-shell-not-found`            | 2026-05-16  | 62         | fix(web): static shell for not-found page (prod hotfix)                          |
| `docs/contributing-and-skills`             | 2026-05-16  | 62         | docs: add CONTRIBUTING.md and SKILLS.md                                          |
| `feat/rfc-005-replay-phase-a`              | 2026-05-18  | 60         | feat(worker): RFC 005 Phase A — replay mode for LiveGwDO                         |
| `ci/node24-deprecation`                    | 2026-05-18  | 60         | ci: bump JavaScript actions to Node 24 versions                                  |
| `feat/home-unified-phase-2`                | 2026-05-19  | 59         | feat(web): mobile snap-scroll + above-the-fold live-rank for unified dashboard   |
| `feat/home-unified-phase-1`                | 2026-05-19  | 59         | Merge pull request #214 from pete-watters/feat/home-unified-phase-2              |
| `docs/tamagui-upstream-bug-draft`          | 2026-05-19  | 59         | docs(tamagui): add PR draft alongside the issue, link them together              |
| `feat/rfc-005-ws4-full-stack-runner`       | 2026-05-20  | 58         | feat(web,worker): RFC 005 full-stack replay runner + e2e                         |
| `feat/worker-recording-capture`            | 2026-05-21  | 57         | feat(worker): tee live snapshots to R2 when capture is enabled (RFC 005)         |
| `feat/rfc-005-ws3-logic-harness`           | 2026-05-21  | 57         | Merge pull request #233 from pete-watters/feat/rfc-005-ws4-full-stack-runner     |
| `feat/rfc-005-ws2-recording-generator`     | 2026-05-21  | 57         | Merge pull request #230 from pete-watters/feat/rfc-005-ws3-logic-harness         |
| `feat/redesign-demos`                      | 2026-05-21  | 57         | feat(web): add home redesign demos (two-state bold, elevated quiet, vibrant stad |
| `chore/recordings-r2-binding`              | 2026-05-21  | 57         | Merge pull request #244 from pete-watters/feat/worker-recording-capture          |
| `chore/season-runner`                      | 2026-05-22  | 56         | feat(scripts): offline season replay runner (RFC 005)                            |
| `stadium-254-takeover`                     | 2026-05-23  | 55         | fix(web): restore palette on dark surfaces + one consolidated status pill        |
| `feat/theme-picker`                        | 2026-05-23  | 55         | perf(web): lazy-load home hero + live-rank section to clear bundle budget        |
| `feat/stadium-tokenize-and-polish`         | 2026-05-23  | 55         | Merge pull request #257 from pete-watters/feat/theme-picker                      |
| `feat/three-distinct-themes`               | 2026-05-25  | 53         | Merge remote-tracking branch 'origin/dev' into feat/three-distinct-themes        |
| `chore/stale-branches-2026-06-04`          | 2026-06-04  | 43         | chore: stale-branch report (13 branches)                                         |
| `chore/security-audit-2026-06-08`          | 2026-06-08  | 39         | chore(security): patch 2 high fast-uri vulnerabilities (CVE-2026-6321, CVE-2026  |
| `fix/rv-05-tiny-league-heuristic`          | 2026-06-11  | 36         | fix(features): raise small-league threshold to 19 for RV-05                      |
| `feat/rv-09-animate-rivals-rank`           | 2026-06-11  | 36         | feat(web): FLIP animation for rivals board rank movement (RV-09)                 |
| `feat/rv-07-rivals-prewarm-worker`         | 2026-06-11  | 36         | feat(worker): scheduled pre-warm for tracked-league rival picks (RV-07)          |
| `feat/posthog-analytics`                   | 2026-06-11  | 36         | feat(web): PostHog analytics with GDPR consent gate and no-PII policy            |
| `feat/mobile-prices-parity`                | 2026-06-11  | 36         | feat(mobile): switch prices to worker endpoint, add skeleton loader              |
| `feat/mobile-planner`                      | 2026-06-11  | 36         | feat(mobile): port Transfer Planner tab                                          |
| `feat/mobile-h2h-parity`                   | 2026-06-11  | 36         | feat(mobile): add kit images and merge captain section in H2H view               |
| `feat/frank-phase-1`                       | 2026-06-11  | 36         | fix(web): set edge runtime on /api/frank/ask for CF Pages                        |
| `feat/eas-build-config`                    | 2026-06-11  | 36         | feat(mobile): EAS Build config + deep-link auth callback helper                  |
| `chore/migration-0003-tiers-frank`         | 2026-06-11  | 36         | chore(supabase): add 0003_tiers_and_frank migration                              |
| `chore/frank-kv-binding`                   | 2026-06-11  | 36         | chore(worker): bind FRANK_WEEKLY_CACHE KV namespace                              |
| `perf/lazy-pitch-column`                   | 2026-06-12  | 35         | perf(web): lazy-load the live pitch column via next/dynamic — Refs #273          |
| `feat/vs-livefpl-page`                     | 2026-06-12  | 35         | feat(web): /vs-livefpl landing page — SC-06                                      |
| `feat/stripe-checkout`                     | 2026-06-12  | 35         | fix(web): use window.location for external Stripe URLs                           |
| `feat/speed-comparison-surface`            | 2026-06-12  | 35         | fix(web,worker): replace as-casts in type guards with in-narrowing               |
| `feat/rv-10-rivals-pro-free-tests`         | 2026-06-12  | 35         | fix(features): tree-shake StubAuthProvider out of prod bundles                   |
| `fix/worker-proxy-hardening`               | 2026-06-15  | 32         | fix(worker): add FPL path allow-list, query param normalisation, and per-IP rate |
| `fix/stripe-webhook-integrity`             | 2026-06-15  | 32         | fix(web): harden Stripe webhook idempotency and add refund/dispute handlers      |
| `fix/segment-error-loading`                | 2026-06-15  | 32         | fix(web): add segment error.tsx and loading.tsx for admin/frank and vs-livefpl   |
| `fix/quiet-theme-page-header-contrast`     | 2026-06-15  | 32         | fix(ui): PageHeader stadium tone honours theme for text contrast                 |
| `fix/profiles-entitlement-rls`             | 2026-06-15  | 32         | fix(db): restrict profiles entitlement columns to service-role writes            |
| `fix/fetch-helper-og-robustness`           | 2026-06-15  | 32         | fix(web): add fetch-with-timeout helper and adopt it in OG/icon font fetches     |
| `fix/authz-input-hardening`                | 2026-06-15  | 32         | fix(web): harden auth callback redirect and frank snapshot injection             |
| `feat/lazy-pitch-column`                   | 2026-06-15  | 32         | chore: bump / bundle budget 185 -> 190 kB                                        |
| `ci/supabase-auto-migrate`                 | 2026-06-15  | 32         | ci: apply supabase migrations on deploy and fix duplicate migration prefix       |
| `chore/cohort-top1k-top100k-scripts`       | 2026-06-15  | 32         | chore(cohorts): add top_1k derivation + top_100k scrape support                  |
| `chore/cohort-top1k-data`                  | 2026-06-15  | 32         | chore(cohorts): add top_1k distributions for all 38 gws                          |
| `fix/worker-security-hardening`            | 2026-06-16  | 31         | fix(web): replace as-casts with isRecord type guard in subscribe route           |
| `fix/stripe-webhook-p2-p3-findings`        | 2026-06-16  | 31         | fix(web): close SECURITY-AUDIT findings #2, #3, #12 in Stripe webhook            |
| `fix/security-hardening`                   | 2026-06-16  | 31         | fix(web): wrap OG and apple-icon font fetches with timeout and fallback (#15/#16 |
| `fix/next-15-5-typed-routes-deprecation`   | 2026-06-16  | 31         | fix(web): move typedRoutes out of experimental in next.config                    |
| `fix/dev-dep-security-advisories`          | 2026-06-16  | 31         | fix(deps): force-upgrade transitive dev deps to close HIGH/CRITICAL advisories   |
| `fix/debug-measure-ssrf`                   | 2026-06-16  | 31         | fix(worker): update debug-measure test after SSRF lockdown                       |
| `chore/dependency-hygiene`                 | 2026-06-16  | 31         | fix(deps): pin next + vitest to caret ranges (avoid 16/4 majors)                 |
| `docs/tamagui-upstream-pr-notes`           | 2026-06-17  | 30         | docs: add upstream Tamagui next-plugin bug report draft (#50)                    |

To delete: `git push origin --delete <branch-name>` or use the GitHub UI → Branches.
