# Stale Branch Report

**Run date (UTC):** 2026-07-25

**Total stale branches:** 82

Branches that have not been pushed to in 30+ days and have no open PR.

| Branch                                     | Last commit | Age (days) | Last commit subject                                                                       |
| ------------------------------------------ | ----------- | ---------- | ----------------------------------------------------------------------------------------- |
| `fix/price-changes-threshold`              | 2026-05-12  | 73         | Merge remote-tracking branch 'origin/dev' into fix/price-changes-threshold                |
| `fix/leagues-uses-team-id`                 | 2026-05-12  | 73         | fix(web): unify leagues view across auth states                                           |
| `fix/input-styling`                        | 2026-05-12  | 73         | chore: prettier                                                                           |
| `fix/home-auto-redirect-saved-team`        | 2026-05-12  | 73         | fix(web): auto-redirect home to /rank/[id] when team ID is saved                          |
| `fix/ci-worker-deploy`                     | 2026-05-12  | 73         | fix(ci): worker deploy uses 'run deploy' to disambiguate from pnpm subcommand             |
| `fix/auth-callback-edge`                   | 2026-05-12  | 73         | fix(web): edge runtime on /auth/callback for Cloudflare Pages                             |
| `feat/tamagui-1.144-extraction-experiment` | 2026-05-12  | 73         | wip: tamagui 1.144 ssr extraction experiment                                              |
| `feat/profile-fpl-entry-id`                | 2026-05-12  | 73         | feat(auth): sync FPL entry ID between localStorage and profiles                           |
| `feat/planner-real-data-revival`           | 2026-05-12  | 73         | feat(web): real-data transfer planner (free tier)                                         |
| `feat/mvp-polish`                          | 2026-05-12  | 73         | docs: note husky pre-commit format gotcha in CLAUDE.md                                    |
| `feat/live-rank-pill-header`               | 2026-05-12  | 73         | fix(web): wrap HomeSearchView in Suspense for static prerender                            |
| `feat/lf-02-do-scaffold`                   | 2026-05-12  | 73         | feat(worker): LiveGwDO scaffolding + /live/ws upgrade route (LF-02, LF-03)                |
| `feat/lf-01-cadence-measurement`           | 2026-05-12  | 73         | feat(scripts): FPL /event/live cadence measurement (LF-01)                                |
| `feat/kit-proxy`                           | 2026-05-12  | 73         | refactor(worker): share FPL host across API + CDN origins                                 |
| `feat/head-to-head-comparison`             | 2026-05-12  | 73         | feat(web): side-by-side pitches + bench in h2h view                                       |
| `feat/h2h-pitches-and-bench`               | 2026-05-12  | 73         | fix(web): wrap HomeSearchView in Suspense for static prerender                            |
| `docs/competitive-rfcs`                    | 2026-05-12  | 73         | docs: RFCs + issue checklists for competitive workstreams                                 |
| `spike/next-16-upgrade`                    | 2026-05-13  | 72         | docs(notes): Next.js 16 upgrade spike                                                     |
| `research/sc-01-speed-comp-feasibility`    | 2026-05-13  | 72         | docs(notes): SC-01 speed-comparison feasibility                                           |
| `research/rv-01-league-paging`             | 2026-05-13  | 72         | docs(notes): RV-01 league paging behaviour                                                |
| `feat/interview-demo-collab-3d-pitch`      | 2026-05-13  | 72         | feat(interview-demo): captain voting layer                                                |
| `feat/lp-02-cohort-engine`                 | 2026-05-14  | 71         | feat(worker): LP-02 cohort engine v0 — aggregation, fetch, scheduled handler              |
| `hotfix/static-shell-not-found`            | 2026-05-16  | 69         | fix(web): static shell for not-found page (prod hotfix)                                   |
| `docs/contributing-and-skills`             | 2026-05-16  | 69         | docs: add CONTRIBUTING.md and SKILLS.md                                                   |
| `feat/rfc-005-replay-phase-a`              | 2026-05-18  | 67         | feat(worker): RFC 005 Phase A — replay mode for LiveGwDO                                  |
| `ci/node24-deprecation`                    | 2026-05-18  | 67         | ci: bump JavaScript actions to Node 24 versions                                           |
| `feat/home-unified-phase-2`                | 2026-05-19  | 66         | feat(web): mobile snap-scroll + above-the-fold live-rank for unified dashboard (Phase 2)  |
| `feat/home-unified-phase-1`                | 2026-05-19  | 66         | Merge pull request #214 from pete-watters/feat/home-unified-phase-2                       |
| `docs/tamagui-upstream-bug-draft`          | 2026-05-19  | 66         | docs(tamagui): add PR draft alongside the issue, link them together                       |
| `feat/rfc-005-ws4-full-stack-runner`       | 2026-05-20  | 65         | feat(web,worker): RFC 005 full-stack replay runner + e2e                                  |
| `feat/worker-recording-capture`            | 2026-05-21  | 64         | feat(worker): tee live snapshots to R2 when capture is enabled (RFC 005)                  |
| `feat/rfc-005-ws3-logic-harness`           | 2026-05-21  | 64         | Merge pull request #233 from pete-watters/feat/rfc-005-ws4-full-stack-runner              |
| `feat/rfc-005-ws2-recording-generator`     | 2026-05-21  | 64         | Merge pull request #230 from pete-watters/feat/rfc-005-ws3-logic-harness                  |
| `feat/redesign-demos`                      | 2026-05-21  | 64         | feat(web): add home redesign demos (two-state bold, elevated quiet, vibrant stadium)      |
| `chore/recordings-r2-binding`              | 2026-05-21  | 64         | Merge pull request #244 from pete-watters/feat/worker-recording-capture                   |
| `chore/season-runner`                      | 2026-05-22  | 63         | feat(scripts): offline season replay runner (RFC 005)                                     |
| `stadium-254-takeover`                     | 2026-05-23  | 62         | fix(web): restore palette on dark surfaces + one consolidated status pill                 |
| `feat/theme-picker`                        | 2026-05-23  | 62         | perf(web): lazy-load home hero + live-rank section to clear bundle budget                 |
| `feat/stadium-tokenize-and-polish`         | 2026-05-23  | 62         | Merge pull request #257 from pete-watters/feat/theme-picker                               |
| `feat/three-distinct-themes`               | 2026-05-25  | 60         | Merge remote-tracking branch 'origin/dev' into feat/three-distinct-themes                 |
| `chore/stale-branches-2026-06-04`          | 2026-06-04  | 50         | chore: stale-branch report (13 branches)                                                  |
| `chore/security-audit-2026-06-08`          | 2026-06-08  | 46         | chore(security): patch 2 high fast-uri vulnerabilities (CVE-2026-6321, CVE-2026-6322)     |
| `fix/rv-05-tiny-league-heuristic`          | 2026-06-11  | 43         | fix(features): raise small-league threshold to 19 for RV-05                               |
| `feat/rv-09-animate-rivals-rank`           | 2026-06-11  | 43         | feat(web): FLIP animation for rivals board rank movement (RV-09)                          |
| `feat/rv-07-rivals-prewarm-worker`         | 2026-06-11  | 43         | feat(worker): scheduled pre-warm for tracked-league rival picks (RV-07)                   |
| `feat/posthog-analytics`                   | 2026-06-11  | 43         | feat(web): PostHog analytics with GDPR consent gate and no-PII policy                     |
| `feat/mobile-prices-parity`                | 2026-06-11  | 43         | feat(mobile): switch prices to worker endpoint, add skeleton loader                       |
| `feat/mobile-planner`                      | 2026-06-11  | 43         | feat(mobile): port Transfer Planner tab                                                   |
| `feat/mobile-h2h-parity`                   | 2026-06-11  | 43         | feat(mobile): add kit images and merge captain section in H2H view                        |
| `feat/frank-phase-1`                       | 2026-06-11  | 43         | fix(web): set edge runtime on /api/frank/ask for CF Pages                                 |
| `feat/eas-build-config`                    | 2026-06-11  | 43         | feat(mobile): EAS Build config + deep-link auth callback helper                           |
| `chore/migration-0003-tiers-frank`         | 2026-06-11  | 43         | chore(supabase): add 0003_tiers_and_frank migration                                       |
| `chore/frank-kv-binding`                   | 2026-06-11  | 43         | chore(worker): bind FRANK_WEEKLY_CACHE KV namespace                                       |
| `perf/lazy-pitch-column`                   | 2026-06-12  | 42         | perf(web): lazy-load the live pitch column via next/dynamic — Refs #273                   |
| `feat/vs-livefpl-page`                     | 2026-06-12  | 42         | feat(web): /vs-livefpl landing page — SC-06                                               |
| `feat/stripe-checkout`                     | 2026-06-12  | 42         | fix(web): use window.location for external Stripe URLs                                    |
| `feat/speed-comparison-surface`            | 2026-06-12  | 42         | fix(web,worker): replace as-casts in type guards with in-narrowing                        |
| `feat/rv-10-rivals-pro-free-tests`         | 2026-06-12  | 42         | fix(features): tree-shake StubAuthProvider out of prod bundles                            |
| `fix/worker-proxy-hardening`               | 2026-06-15  | 39         | fix(worker): add FPL path allow-list, query param normalisation, and per-IP rate limiting |
| `fix/stripe-webhook-integrity`             | 2026-06-15  | 39         | fix(web): harden Stripe webhook idempotency and add refund/dispute handlers               |
| `fix/segment-error-loading`                | 2026-06-15  | 39         | fix(web): add segment error.tsx and loading.tsx for admin/frank and vs-livefpl            |
| `fix/quiet-theme-page-header-contrast`     | 2026-06-15  | 39         | fix(ui): PageHeader stadium tone honours theme for text contrast                          |
| `fix/profiles-entitlement-rls`             | 2026-06-15  | 39         | fix(db): restrict profiles entitlement columns to service-role writes                     |
| `fix/fetch-helper-og-robustness`           | 2026-06-15  | 39         | fix(web): add fetch-with-timeout helper and adopt it in OG/icon font fetches              |
| `fix/authz-input-hardening`                | 2026-06-15  | 39         | fix(web): harden auth callback redirect and frank snapshot injection                      |
| `feat/lazy-pitch-column`                   | 2026-06-15  | 39         | chore: bump / bundle budget 185 -> 190 kB                                                 |
| `ci/supabase-auto-migrate`                 | 2026-06-15  | 39         | ci: apply supabase migrations on deploy and fix duplicate migration prefix                |
| `chore/cohort-top1k-top100k-scripts`       | 2026-06-15  | 39         | chore(cohorts): add top_1k derivation + top_100k scrape support                           |
| `chore/cohort-top1k-data`                  | 2026-06-15  | 39         | chore(cohorts): add top_1k distributions for all 38 gws                                   |
| `fix/worker-security-hardening`            | 2026-06-16  | 38         | fix(web): replace as-casts with isRecord type guard in subscribe route                    |
| `fix/stripe-webhook-p2-p3-findings`        | 2026-06-16  | 38         | fix(web): close SECURITY-AUDIT findings #2, #3, #12 in Stripe webhook                     |
| `fix/security-hardening`                   | 2026-06-16  | 38         | fix(web): wrap OG and apple-icon font fetches with timeout and fallback (#15/#16)         |
| `fix/next-15-5-typed-routes-deprecation`   | 2026-06-16  | 38         | fix(web): move typedRoutes out of experimental in next.config                             |
| `fix/dev-dep-security-advisories`          | 2026-06-16  | 38         | fix(deps): force-upgrade transitive dev deps to close HIGH/CRITICAL advisories            |
| `fix/debug-measure-ssrf`                   | 2026-06-16  | 38         | fix(worker): update debug-measure test after SSRF lockdown                                |
| `chore/dependency-hygiene`                 | 2026-06-16  | 38         | fix(deps): pin next + vitest to caret ranges (avoid 16/4 majors)                          |
| `docs/tamagui-upstream-pr-notes`           | 2026-06-17  | 37         | docs: add upstream Tamagui next-plugin bug report draft (#50)                             |
| `feat/rfc-005-phase-b-gw36`                | 2026-06-20  | 34         | feat(features): cohort live-rank simulator harness + gw36 replay bundle                   |
| `feat/frank-tier-gating`                   | 2026-06-20  | 34         | feat(frank): tier-gated access with cache/live split and boundary-safe cache              |
| `feat/detailed-league-row`                 | 2026-06-20  | 34         | feat(ui): detailed league row with progressive disclosure                                 |
| `feat/mobile-h2h-stadium-header`           | 2026-06-22  | 32         | feat(mobile): port head-to-head to stadium PageHeader                                     |
| `chore/security-audit-2026-06-22`          | 2026-06-22  | 32         | chore(security): patch 12 vulnerabilities — ws, dompurify, protobufjs, js-yaml, piscina   |

To delete: `git push origin --delete <branch-name>` or use the GitHub UI → Branches.
