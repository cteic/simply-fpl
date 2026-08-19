---
description: Prod hotfix workflow — branch off main, edit, PR to main, assign Pete + status comment
---

When the user invokes `/hotfix [optional short description]`, execute the GitFlow hotfix workflow per CLAUDE.md.

This is the **only** workflow where a PR targets `main` directly. Every other PR targets `dev`.

## Steps

1. **Check working tree.** Run `git status --short`. If there are uncommitted changes on the current branch, stash them with `git stash push -u -m "WIP before hotfix"` and remember to restore later.

2. **Fetch + branch off main.** Run `git fetch origin main`, then `git switch -c hotfix/<short-name> origin/main`. If the user didn't supply a short-name as an argument, ask for one via AskUserQuestion. Use kebab-case (e.g. `disable-tamagui-extraction`, `revert-bad-query`).

3. **Identify + apply the fix.** Confirm the root cause with the user before editing. Apply the _minimum surgical patch_ — no surrounding cleanup, no opportunistic refactors. See CLAUDE.md "What NOT to do".

4. **Verify locally** per CLAUDE.md "Verification" section (format / lint / typecheck on affected packages). If local tooling hangs (rare — has happened during real incidents), surface it to the user and ask whether to skip the hook with `--no-verify` for this one commit. Never use `--no-verify` silently.

5. **Commit** with a conventional-commit message scoped to the affected area: `fix(<scope>): <short description>`. Include a `Type: hotfix` trailer in the body.

6. **Push the branch.** `git push -u origin hotfix/<short-name>`.

7. **Open PR to main** with `gh pr create --base main --head hotfix/<short-name>`. PR body shape:
   - **Summary** — what changed and why (1-3 bullets)
   - **Trade-off** — what we lose temporarily, if anything
   - **Verification** — what CI will catch, manual smoke-test steps
   - **Follow-up** — note the cherry-pick to dev, and any upstream issue worth filing
   - Title + body only. No "Generated with Claude Code" footer, no Test Plan section.

8. **Assign Pete** so it lands on his dashboard: `gh pr edit <N> --add-assignee pete-watters`. GitHub rejects review requests on self-authored PRs, so assignee is the visibility signal.

9. **Status comment** opening with `@pete-watters`. Shape:
   - **Shipped** — bullets of what landed in this PR
   - **Pending / decisions needed** — blockers, smoke-test asks
   - **Verification** — CI status, any manual steps Pete needs to take

10. **After merge:** cherry-pick the hotfix commit onto `dev` as a separate PR. Branch name `chore/sync-<short-name>-into-dev`, PR base `dev`. Restore any stashed WIP on the original branch.

## Notes

- The repo defaults to `dev` as the integration branch. Hotfixes are the only PRs that bypass it.
- Branch protection is not enforced via GitHub (Free tier). Discipline replaces enforcement — never direct-push to `main` or `dev`.
- If the user is mobile-only during an outage, the only action they need to take is hitting "Merge" on the PR. Cloudflare Workers auto-deploys `main`.
- If `gh pr create` returns a URL, surface it prominently in the user-facing message so they can tap to merge.
