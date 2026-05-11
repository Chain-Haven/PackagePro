# Branch protection setup

These rules must be enabled in the GitHub UI (Settings → Branches → Branch protection rules). They cannot be configured from a PR.

## Recommended rules for `main`

1. **Restrict pushes that create matching branches** — only allow PR merges.
2. **Require a pull request before merging**
   - Require approvals: **1** (raise to 2 once the team is bigger)
   - Dismiss stale pull request approvals when new commits are pushed: **on**
   - Require review from Code Owners: **on**
3. **Require status checks to pass before merging**
   - Require branches to be up to date before merging: **on**
   - Required checks (add each one after the first CI run names them):
     - `Lint & Format`
     - `Type Check`
     - `Unit Tests`
     - `Ops Tests (secrets scanner)`
     - `Build`
     - `E2E Smoke Tests`
4. **Require conversation resolution before merging:** **on**
5. **Require signed commits:** optional, but recommended.
6. **Do not allow bypassing the above settings:** **on** (including for admins, unless you specifically need a break-glass).
7. **Restrict who can push to matching branches:** leave empty so no one can force-push to `main`.
8. **Allow force pushes:** **off**.
9. **Allow deletions:** **off**.

## Optional but valuable

- **Require deployments to succeed before merging** — useful once a staging environment exists.
- **Lock branch** — for release branches that should never accept new commits.

## Repo-wide settings to flip on

- **Settings → General → Pull Requests**
  - Allow squash merging: **on** (default)
  - Allow merge commits: **off**
  - Allow rebase merging: optional
  - Automatically delete head branches: **on**
- **Settings → Security → Code security and analysis**
  - Dependabot alerts: **on**
  - Dependabot security updates: **on**
  - Secret scanning: **on**
  - Push protection: **on**
