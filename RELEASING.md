# Git Branch and Release Model

This repository uses a lightweight `main`/`develop` model. `main` records released history, `develop` integrates upcoming work, and every other branch is temporary.

## Branch roles

| Branch | Start from | Merge into | Lifetime |
| --- | --- | --- | --- |
| `main` | — | — | Permanent; released commits only |
| `develop` | `main` | — | Permanent; next-release integration |
| `feat/*`, `fix/*`, `docs/*`, `chore/*`, `codex/*` | `develop` | `develop` | Delete after merge |
| `release/vX.Y.Z` | `develop` | `main`, then synchronize `main` through a temporary `sync/*` branch | Delete after release |
| `hotfix/vX.Y.Z` | `main` | `main`, then synchronize `main` through a temporary `sync/*` branch | Delete after release |
| `sync/main-to-develop-*` | latest `develop` | `develop` after merging `main` into the temporary branch | Delete after synchronization |

Do not open a direct `develop` to `main` release pull request. A temporary `release/*` branch keeps `develop` permanent when GitHub automatically deletes merged head branches.

## Daily development

1. Update `develop` and create a topic branch from it.
2. Keep the change focused and add tests for changed behavior.
3. Open a pull request into `develop` and require CI to pass. Use a merge commit so merged-branch cleanup remains provable from ancestry.
4. Merge the pull request and delete its remote branch.
5. Run `git fetch --prune` locally and delete the merged local branch with `git branch -d`.

## Normal release

1. Create `release/vX.Y.Z` from the current verified `develop`.
2. Set `package.json` and `package-lock.json` to `X.Y.Z`, finalize release notes, and run:

   ```sh
   npm ci
   npm test
   npm run test:skill
   npm run test:package
   npm audit --omit=dev
   npm pack --dry-run
   ```

3. Open a pull request from `release/vX.Y.Z` to `main`. Require review and green CI, and use a merge commit to preserve release ancestry.
4. Merge without rewriting an existing release tag. Record the resulting `main` commit as `R`.
5. Confirm `R` is clean, on `main`, and still reports version `X.Y.Z`.
6. Create and push an annotated tag:

   ```sh
   git tag -a vX.Y.Z R -m "Release vX.Y.Z"
   git push origin vX.Y.Z
   ```

7. The tag-triggered workflow packs once, tests that exact tarball, creates a draft GitHub Release, and submits the tarball with `npm stage publish --tag next`. It must stop before public publication.
8. From an authenticated maintainer workstation, list and inspect the staged package, download its tarball, and run the repository contract against that exact file:

   ```sh
   npm stage list code-to-docx
   npm stage view <stage-id>
   npm stage download <stage-id>
   npm run test:artifact -- --tarball <downloaded-tarball> --expected-version X.Y.Z
   ```

9. After the staged tarball passes, approve it with interactive 2FA. Then wait for the exact public version and run the independent registry regression against release commit `R`:

   ```sh
   npm stage approve <stage-id>
   npm run test:published -- --version X.Y.Z --expected-sha R
   ```

10. Record the previous `latest`, request explicit approval, then promote the accepted version and publish the existing draft GitHub Release. Verify both pointers afterward:

    ```sh
    npm view code-to-docx dist-tags --json
    npm dist-tag add code-to-docx@X.Y.Z latest
    npm view code-to-docx@latest version
    gh release edit vX.Y.Z --draft=false --latest
    gh release view vX.Y.Z --json tagName,isDraft,isLatest,url
    ```

11. Review the draft synchronization pull request opened automatically by `sync-main-to-develop.yml`. The workflow creates a disposable branch from the latest `develop`, merges `main` into that branch, and targets the branch back to `develop`; it never modifies `main`. Approve the queued workflow runs and use **Create a merge commit**. Do not squash or rebase because `develop` must retain the released `main` commit in its ancestry. If `develop` advances before the merge, close the stale synchronization pull request and rerun the workflow instead of rebasing it. Then delete `release/vX.Y.Z` locally and remotely.

Never move or reuse a published tag. The `vX.Y.Z` tag, npm `X.Y.Z`, package manifests, GitHub Release, workflow run, and commit `R` must describe the same release.

## Hotfix

1. Create `hotfix/vX.Y.Z` from the latest known-good `main` tag or commit.
2. Apply the smallest fix, bump the patch version, and run the full release checks.
3. Merge into `main`, create the matching annotated tag, and let the release workflow finish.
4. Synchronize `main` into `develop` so the fix cannot be lost.

## Cleanup safety

Enable GitHub **Automatically delete head branches**. Protect `main` and `develop` from deletion and force pushes, and require pull requests plus CI for both.

Before manual deletion, prove that the pull request was merged and that the branch has no unique work. Show the exact branch list, then use safe deletion:

```sh
git fetch --prune
git branch -d <merged-local-branch>
git push origin --delete <merged-remote-branch>
```

Squash-merged topic branches may be rejected by `git branch -d` even after their pull request is merged. Use `git branch -D` only for one exact local branch after rechecking the merged pull request, destination content, and absence of unique work.

Do not bulk-delete with unresolved globs, use `git branch -D` as routine cleanup, delete `main` or `develop`, or delete a branch with an open pull request or unmerged work.

## Repository settings

- Default branch: `main`.
- Require pull requests and CI on `main` and `develop`.
- Block force pushes and branch deletion on permanent branches.
- Enable automatic deletion of merged head branches.
- Protect `v*` tags from update or deletion when repository rulesets are available.
- Enable **Allow GitHub Actions to create and approve pull requests** under Actions workflow permissions. The synchronization workflow requests `contents: write` to push one temporary `sync/main-to-develop-*` branch and `pull-requests: write` to open its draft PR; it never writes to `main` or `develop`, approves checks, or merges the PR.
- Protect the `npm-stage` environment with required reviewers, prevent self-review when practical, and restrict deployment to protected `v*` tags.
- Configure npm Trusted Publishing for `publish.yml`, environment `npm-stage`, and the `npm stage publish` action only. Disallow token-based publishing.
- Use merge commits for topic pull requests into `develop`, release/hotfix pull requests into `main`, and synchronization from `main` back into `develop`.

`sync-main-to-develop.yml` runs after a merged `release/*` or `hotfix/*` pull request into `main`. It skips when `main` is already an ancestor of `develop`, reuses an existing open sync PR, and otherwise starts a unique temporary branch from the latest `develop`, creates a merge commit containing `main`, pushes only that branch, and opens a draft PR back to `develop`. It can also be run manually from the Actions page for recovery. A pull request opened with `GITHUB_TOKEN` requires a maintainer to select **Approve workflows to run** before the normal PR checks start. Close a pending synchronization PR to stop it; rerun the workflow to replace a stale or conflicted attempt. Neither permanent branch changes until a maintainer merges the PR.

## Scheduled Agent Skill acceptance

The weekly `Scheduled Agent Skill acceptance` workflow always tests installation with the latest `skills` CLI, installation from the public `xllily/code-to-docx` source, package behavior, and the production dependency audit. GitHub registers the schedule only after the workflow exists on `main`; its jobs deliberately check out `develop` so upcoming changes are exercised before release. These scheduled checks require no Agent API keys and do not claim runtime coverage.

Real Agent smoke is currently a local maintainer check for Codex and Claude Code. Run `npm run test:agent:local` after both CLIs are installed and logged in, or run one target with `npm run test:agent -- codex` or `npm run test:agent -- claude-code`. The harness installs the project Skill into an empty temporary workspace, starts the real Agent in its official non-interactive mode, and asks it for an exact versioned fallback command that appears only inside the installed `SKILL.md`. A failed Agent process, undiscovered Skill, or incorrect response fails the command. Existing local login state is used by default; `AGENT_RUNTIME_API_KEY` is available for an explicit one-off credential without placing it in command arguments.

Other products remain installation-contract or manual acceptance targets. Do not report them as automated runtime coverage until an official headless runtime is added to the local smoke harness and exercised successfully.

## Recovery

Before staged approval, reject a failing candidate and leave the GitHub Release in draft. After approval, never move `latest` until `test:published` passes. If an already-promoted release is defective, restore the previous known-good `latest` dist-tag, deprecate the bad npm version, mark the GitHub Release clearly, and publish a corrected patch. Do not unpublish routinely, force-move tags, or rewrite shared history.
