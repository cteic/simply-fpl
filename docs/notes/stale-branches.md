# Stale Branch Report

**Run date (UTC):** 2026-07-11

**Total stale branches:** 42

Branches that have not been pushed to in 30+ days and have no open PR.

| Branch                                     | Last commit | Age (days) | Last commit subject                                                                      |
| ------------------------------------------ | ----------- | ---------- | ---------------------------------------------------------------------------------------- |
| `docs/competitive-rfcs`                    | 2026-05-12  | 59         | docs: RFCs + issue checklists for competitive workstreams                                |
| `feat/h2h-pitches-and-bench`               | 2026-05-12  | 59         | fix(web): wrap HomeSearchView in Suspense for static prerender                           |
| `feat/head-to-head-comparison`             | 2026-05-12  | 59         | feat(web): side-by-side pitches + bench in h2h view                                      |
| `feat/kit-proxy`                           | 2026-05-12  | 59         | refactor(worker): share FPL host across API + CDN origins                                |
| `feat/lf-01-cadence-measurement`           | 2026-05-12  | 59         | feat(scripts): FPL /event/live cadence measurement (LF-01)                               |
| `feat/lf-02-do-scaffold`                   | 2026-05-12  | 59         | feat(worker): LiveGwDO scaffolding + /live/ws upgrade route (LF-02, LF-03)               |
| `feat/live-rank-pill-header`               | 2026-05-12  | 59         | fix(web): wrap HomeSearchView in Suspense for static prerender                           |
| `feat/mvp-polish`                          | 2026-05-12  | 59         | docs: note husky pre-commit format gotcha in CLAUDE.md                                   |
| `feat/planner-real-data-revival`           | 2026-05-12  | 59         | feat(web): real-data transfer planner (free tier)                                        |
| `feat/profile-fpl-entry-id`                | 2026-05-12  | 59         | feat(auth): sync FPL entry ID between localStorage and profiles                          |
| `feat/tamagui-1.144-extraction-experiment` | 2026-05-12  | 59         | wip: tamagui 1.144 ssr extraction experiment                                             |
| `fix/auth-callback-edge`                   | 2026-05-12  | 59         | fix(web): edge runtime on /auth/callback for Cloudflare Pages                            |
| `fix/ci-worker-deploy`                     | 2026-05-12  | 59         | fix(ci): worker deploy uses 'run deploy' to disambiguate from pnpm subcommand            |
| `fix/home-auto-redirect-saved-team`        | 2026-05-12  | 59         | fix(web): auto-redirect home to /rank/[id] when team ID is saved                         |
| `fix/input-styling`                        | 2026-05-12  | 59         | chore: prettier                                                                          |
| `fix/leagues-uses-team-id`                 | 2026-05-12  | 59         | fix(web): unify leagues view across auth states                                          |
| `fix/price-changes-threshold`              | 2026-05-12  | 59         | Merge remote-tracking branch 'origin/dev' into fix/price-changes-threshold               |
| `feat/interview-demo-collab-3d-pitch`      | 2026-05-13  | 58         | feat(interview-demo): captain voting layer                                               |
| `research/rv-01-league-paging`             | 2026-05-13  | 58         | docs(notes): RV-01 league paging behaviour                                               |
| `research/sc-01-speed-comp-feasibility`    | 2026-05-13  | 58         | docs(notes): SC-01 speed-comparison feasibility                                          |
| `spike/next-16-upgrade`                    | 2026-05-13  | 58         | docs(notes): Next.js 16 upgrade spike                                                    |
| `feat/lp-02-cohort-engine`                 | 2026-05-14  | 57         | feat(worker): LP-02 cohort engine v0 — aggregation, fetch, scheduled handler             |
| `docs/contributing-and-skills`             | 2026-05-16  | 55         | docs: add CONTRIBUTING.md and SKILLS.md                                                  |
| `hotfix/static-shell-not-found`            | 2026-05-16  | 55         | fix(web): static shell for not-found page (prod hotfix)                                  |
| `ci/node24-deprecation`                    | 2026-05-18  | 53         | ci: bump JavaScript actions to Node 24 versions                                          |
| `feat/rfc-005-replay-phase-a`              | 2026-05-18  | 53         | feat(worker): RFC 005 Phase A — replay mode for LiveGwDO                                 |
| `docs/tamagui-upstream-bug-draft`          | 2026-05-19  | 52         | docs(tamagui): add PR draft alongside the issue, link them together                      |
| `feat/home-unified-phase-1`                | 2026-05-19  | 52         | Merge pull request #214 from pete-watters/feat/home-unified-phase-2                      |
| `feat/home-unified-phase-2`                | 2026-05-19  | 52         | feat(web): mobile snap-scroll + above-the-fold live-rank for unified dashboard (Phase 2) |
| `feat/rfc-005-ws4-full-stack-runner`       | 2026-05-20  | 51         | feat(web,worker): RFC 005 full-stack replay runner + e2e                                 |
| `chore/recordings-r2-binding`              | 2026-05-21  | 50         | Merge pull request #244 from pete-watters/feat/worker-recording-capture                  |
| `feat/redesign-demos`                      | 2026-05-21  | 50         | feat(web): add home redesign demos (two-state bold, elevated quiet, vibrant stadium)     |
| `feat/rfc-005-ws2-recording-generator`     | 2026-05-21  | 50         | Merge pull request #230 from pete-watters/feat/rfc-005-ws3-logic-harness                 |
| `feat/rfc-005-ws3-logic-harness`           | 2026-05-21  | 50         | Merge pull request #233 from pete-watters/feat/rfc-005-ws4-full-stack-runner             |
| `feat/worker-recording-capture`            | 2026-05-21  | 50         | feat(worker): tee live snapshots to R2 when capture is enabled (RFC 005)                 |
| `chore/season-runner`                      | 2026-05-22  | 49         | feat(scripts): offline season replay runner (RFC 005)                                    |
| `feat/stadium-tokenize-and-polish`         | 2026-05-23  | 48         | Merge pull request #257 from pete-watters/feat/theme-picker                              |
| `feat/theme-picker`                        | 2026-05-23  | 48         | perf(web): lazy-load home hero + live-rank section to clear bundle budget                |
| `stadium-254-takeover`                     | 2026-05-23  | 48         | fix(web): restore palette on dark surfaces + one consolidated status pill                |
| `feat/three-distinct-themes`               | 2026-05-25  | 46         | Merge remote-tracking branch 'origin/dev' into feat/three-distinct-themes                |
| `chore/stale-branches-2026-06-04`          | 2026-06-04  | 36         | chore: stale-branch report (13 branches)                                                 |
| `chore/security-audit-2026-06-08`          | 2026-06-08  | 32         | chore(security): patch 2 high fast-uri vulnerabilities (CVE-2026-6321, CVE-2026-6322)    |

To delete: `git push origin --delete <branch-name>` or use the GitHub UI → Branches.
