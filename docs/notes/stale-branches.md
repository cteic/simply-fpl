# Stale Branch Report

**Run date:** 2026-08-11 (UTC)  
**Total stale branches:** 90  
_(No push in 30+ days; no open PR)_

| Branch                                   | Last commit | Age (days) | Last commit subject                                                                  |
| ---------------------------------------- | ----------- | ---------- | ------------------------------------------------------------------------------------ |
| chore/cohort-top1k-data                  | 2026-06-15  | 56         | chore(cohorts): add top_1k distributions for all 38 gws                              |
| chore/cohort-top1k-top100k-scripts       | 2026-06-15  | 56         | chore(cohorts): add top_1k derivation + top_100k scrape support                      |
| chore/dependency-hygiene                 | 2026-06-16  | 55         | fix(deps): pin next + vitest to caret ranges (avoid 16/4 majors)                     |
| chore/frank-kv-binding                   | 2026-06-11  | 60         | chore(worker): bind FRANK_WEEKLY_CACHE KV namespace                                  |
| chore/migration-0003-tiers-frank         | 2026-06-11  | 60         | chore(supabase): add 0003_tiers_and_frank migration                                  |
| chore/recordings-r2-binding              | 2026-05-21  | 81         | Merge pull request #244 from pete-watters/feat/worker-recording-capture              |
| chore/season-runner                      | 2026-05-22  | 80         | feat(scripts): offline season replay runner (RFC 005)                                |
| chore/security-audit-2026-06-08          | 2026-06-08  | 64         | chore(security): patch 2 high fast-uri vulnerabilities (CVE-2026-6321, CVE-2026-6322 |
| chore/security-audit-2026-06-22          | 2026-06-22  | 50         | chore(security): patch 12 vulnerabilities — ws, dompurify, protobufjs, js-yaml, pisc |
| chore/stale-branches-2026-06-04          | 2026-06-04  | 68         | chore: stale-branch report (13 branches)                                             |
| chore/stale-branches-2026-06-25          | 2026-06-25  | 47         | chore: stale-branch report (154 branches)                                            |
| ci/node24-deprecation                    | 2026-05-18  | 84         | ci: bump JavaScript actions to Node 24 versions                                      |
| ci/supabase-auto-migrate                 | 2026-06-15  | 56         | ci: apply supabase migrations on deploy and fix duplicate migration prefix           |
| docs/competitive-rfcs                    | 2026-05-12  | 90         | docs: RFCs + issue checklists for competitive workstreams                            |
| docs/contributing-and-skills             | 2026-05-16  | 86         | docs: add CONTRIBUTING.md and SKILLS.md                                              |
| docs/design-audit-proposals              | 2026-07-03  | 38         | chore(ci): raise / budget to 213 kB and /h2h to 167 kB for motion hooks              |
| docs/simplicity-speed-review             | 2026-07-03  | 38         | docs(notes): simplicity and speed review — ranked findings                           |
| docs/tamagui-upstream-bug-draft          | 2026-05-19  | 84         | docs(tamagui): add PR draft alongside the issue, link them together                  |
| docs/tamagui-upstream-pr-notes           | 2026-06-17  | 54         | docs: add upstream Tamagui next-plugin bug report draft (#50)                        |
| feat/detailed-league-row                 | 2026-06-20  | 52         | feat(ui): detailed league row with progressive disclosure                            |
| feat/eas-build-config                    | 2026-06-11  | 60         | feat(mobile): EAS Build config + deep-link auth callback helper                      |
| feat/frank-phase-1                       | 2026-06-11  | 60         | fix(web): set edge runtime on /api/frank/ask for CF Pages                            |
| feat/frank-tier-gating                   | 2026-06-20  | 52         | feat(frank): tier-gated access with cache/live split and boundary-safe cache         |
| feat/h2h-pitches-and-bench               | 2026-05-12  | 90         | fix(web): wrap HomeSearchView in Suspense for static prerender                       |
| feat/head-to-head-comparison             | 2026-05-12  | 90         | feat(web): side-by-side pitches + bench in h2h view                                  |
| feat/home-unified-phase-1                | 2026-05-19  | 83         | Merge pull request #214 from pete-watters/feat/home-unified-phase-2                  |
| feat/home-unified-phase-2                | 2026-05-19  | 83         | feat(web): mobile snap-scroll + above-the-fold live-rank (Phase 2)                   |
| feat/i18n-extraction                     | 2026-06-26  | 45         | feat(i18n): extract all user-facing strings into @simplyfpl/i18n                     |
| feat/i18n-extraction-v2                  | 2026-06-26  | 45         | chore(i18n): bump vitest to ^3.2.6 to match workspace, format lockfile               |
| feat/interview-demo-collab-3d-pitch      | 2026-05-13  | 89         | feat(interview-demo): captain voting layer                                           |
| feat/kit-proxy                           | 2026-05-12  | 90         | refactor(worker): share FPL host across API + CDN origins                            |
| feat/lazy-pitch-column                   | 2026-06-15  | 56         | chore: bump / bundle budget 185 -> 190 kB                                            |
| feat/lf-01-cadence-measurement           | 2026-05-12  | 90         | feat(scripts): FPL /event/live cadence measurement (LF-01)                           |
| feat/lf-02-do-scaffold                   | 2026-05-12  | 90         | feat(worker): LiveGwDO scaffolding + /live/ws upgrade route (LF-02, LF-03)           |
| feat/live-rank-pill-header               | 2026-05-12  | 90         | fix(web): wrap HomeSearchView in Suspense for static prerender                       |
| feat/lp-02-cohort-engine                 | 2026-05-14  | 88         | feat(worker): LP-02 cohort engine v0 — aggregation, fetch, scheduled handler         |
| feat/mobile-h2h-parity                   | 2026-06-11  | 60         | feat(mobile): add kit images and merge captain section in H2H view                   |
| feat/mobile-h2h-stadium-header           | 2026-06-22  | 50         | feat(mobile): port head-to-head to stadium PageHeader                                |
| feat/mobile-planner                      | 2026-06-11  | 60         | feat(mobile): port Transfer Planner tab                                              |
| feat/mobile-prices-parity                | 2026-06-11  | 60         | feat(mobile): switch prices to worker endpoint, add skeleton loader                  |
| feat/mobile-prices-stadium-header        | 2026-06-29  | 43         | feat(mobile): port stadium PageHeader and defcon mini-bar to Prices                  |
| feat/mvp-polish                          | 2026-05-12  | 90         | docs: note husky pre-commit format gotcha in CLAUDE.md                               |
| feat/planner-real-data-revival           | 2026-05-12  | 90         | feat(web): real-data transfer planner (free tier)                                    |
| feat/posthog-analytics                   | 2026-06-11  | 60         | feat(web): PostHog analytics with GDPR consent gate and no-PII policy                |
| feat/profile-fpl-entry-id                | 2026-05-12  | 90         | feat(auth): sync FPL entry ID between localStorage and profiles                      |
| feat/redesign-demos                      | 2026-05-21  | 81         | feat(web): add home redesign demos (two-state bold, elevated quiet, vibrant stadium) |
| feat/rfc-005-phase-b-gw36                | 2026-06-20  | 52         | feat(features): cohort live-rank simulator harness + gw36 replay bundle              |
| feat/rfc-005-replay-phase-a              | 2026-05-18  | 84         | feat(worker): RFC 005 Phase A — replay mode for LiveGwDO                             |
| feat/rfc-005-ws2-recording-generator     | 2026-05-21  | 81         | Merge pull request #230 from pete-watters/feat/rfc-005-ws3-logic-harness             |
| feat/rfc-005-ws3-logic-harness           | 2026-05-21  | 81         | Merge pull request #233 from pete-watters/feat/rfc-005-ws4-full-stack-runner         |
| feat/rfc-005-ws4-full-stack-runner       | 2026-05-20  | 82         | feat(web,worker): RFC 005 full-stack replay runner + e2e                             |
| feat/rv-07-rivals-prewarm-worker         | 2026-06-11  | 60         | feat(worker): scheduled pre-warm for tracked-league rival picks (RV-07)              |
| feat/rv-09-animate-rivals-rank           | 2026-06-11  | 60         | feat(web): FLIP animation for rivals board rank movement (RV-09)                     |
| feat/rv-10-rivals-pro-free-tests         | 2026-06-12  | 59         | fix(features): tree-shake StubAuthProvider out of prod bundles                       |
| feat/speed-comparison-surface            | 2026-06-12  | 59         | fix(web,worker): replace as-casts in type guards with in-narrowing                   |
| feat/stadium-tokenize-and-polish         | 2026-05-23  | 79         | Merge pull request #257 from pete-watters/feat/theme-picker                          |
| feat/stripe-checkout                     | 2026-06-12  | 59         | fix(web): use window.location for external Stripe URLs                               |
| feat/tamagui-1.144-extraction-experiment | 2026-05-12  | 90         | wip: tamagui 1.144 ssr extraction experiment                                         |
| feat/theme-picker                        | 2026-05-23  | 79         | perf(web): lazy-load home hero + live-rank section to clear bundle budget            |
| feat/three-distinct-themes               | 2026-05-25  | 77         | Merge remote-tracking branch 'origin/dev' into feat/three-distinct-themes            |
| feat/vs-livefpl-page                     | 2026-06-12  | 59         | feat(web): /vs-livefpl landing page — SC-06                                          |
| feat/worker-recording-capture            | 2026-05-21  | 81         | feat(worker): tee live snapshots to R2 when capture is enabled (RFC 005)             |
| fix/auth-callback-edge                   | 2026-05-12  | 90         | fix(web): edge runtime on /auth/callback for Cloudflare Pages                        |
| fix/authz-input-hardening                | 2026-06-15  | 56         | fix(web): harden auth callback redirect and frank snapshot injection                 |
| fix/ci-worker-deploy                     | 2026-05-12  | 90         | fix(ci): worker deploy uses 'run deploy' to disambiguate from pnpm subcommand        |
| fix/debug-measure-ssrf                   | 2026-06-16  | 55         | fix(worker): update debug-measure test after SSRF lockdown                           |
| fix/dev-dep-security-advisories          | 2026-06-16  | 55         | fix(deps): force-upgrade transitive dev deps to close HIGH/CRITICAL advisories       |
| fix/fetch-helper-og-robustness           | 2026-06-15  | 56         | fix(web): add fetch-with-timeout helper and adopt it in OG/icon font fetches         |
| fix/home-auto-redirect-saved-team        | 2026-05-12  | 90         | fix(web): auto-redirect home to /rank/[id] when team ID is saved                     |
| fix/input-styling                        | 2026-05-12  | 90         | chore: prettier                                                                      |
| fix/leagues-uses-team-id                 | 2026-05-12  | 90         | fix(web): unify leagues view across auth states                                      |
| fix/next-15-5-typed-routes-deprecation   | 2026-06-16  | 55         | fix(web): move typedRoutes out of experimental in next.config                        |
| fix/price-changes-threshold              | 2026-05-12  | 90         | Merge remote-tracking branch 'origin/dev' into fix/price-changes-threshold           |
| fix/profiles-entitlement-rls             | 2026-06-15  | 56         | fix(db): restrict profiles entitlement columns to service-role writes                |
| fix/quiet-theme-page-header-contrast     | 2026-06-15  | 56         | fix(ui): PageHeader stadium tone honours theme for text contrast                     |
| fix/rv-05-tiny-league-heuristic          | 2026-06-11  | 60         | fix(features): raise small-league threshold to 19 for RV-05                          |
| fix/security-hardening                   | 2026-06-16  | 55         | fix(web): wrap OG and apple-icon font fetches with timeout and fallback (#15/#16)    |
| fix/segment-error-loading                | 2026-06-15  | 56         | fix(web): add segment error.tsx and loading.tsx for admin/frank and vs-livefpl       |
| fix/stripe-webhook-integrity             | 2026-06-15  | 56         | fix(web): harden Stripe webhook idempotency and add refund/dispute handlers          |
| fix/stripe-webhook-p2-p3-findings        | 2026-06-16  | 55         | fix(web): close SECURITY-AUDIT findings #2, #3, #12 in Stripe webhook                |
| fix/web-audit-criticals                  | 2026-07-03  | 38         | fix(web): claim-first stripe idempotency, subscription status guard, frank quota re… |
| fix/worker-audit-criticals               | 2026-07-03  | 38         | fix(worker): close audit criticals — prod WS origins, atomic cohort lock, snapshot…  |
| fix/worker-proxy-hardening               | 2026-06-15  | 56         | fix(worker): add FPL path allow-list, query param normalisation, and per-IP rate li… |
| fix/worker-security-hardening            | 2026-06-16  | 55         | fix(web): replace as-casts with isRecord type guard in subscribe route               |
| hotfix/static-shell-not-found            | 2026-05-16  | 86         | fix(web): static shell for not-found page (prod hotfix)                              |
| perf/lazy-pitch-column                   | 2026-06-12  | 59         | perf(web): lazy-load the live pitch column via next/dynamic — Refs #273              |
| research/rv-01-league-paging             | 2026-05-13  | 89         | docs(notes): RV-01 league paging behaviour                                           |
| research/sc-01-speed-comp-feasibility    | 2026-05-13  | 89         | docs(notes): SC-01 speed-comparison feasibility                                      |
| spike/next-16-upgrade                    | 2026-05-13  | 89         | docs(notes): Next.js 16 upgrade spike                                                |
| stadium-254-takeover                     | 2026-05-23  | 79         | fix(web): restore palette on dark surfaces + one consolidated status pill            |

To delete: `git push origin --delete <branch-name>` or use the GitHub UI → Branches.
