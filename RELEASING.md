# Git Branch and Release Model

This repository uses a lightweight `main`/`develop` model. `main` records released history, `develop` integrates upcoming work, and every other branch is temporary.

## Branch roles

| Branch | Start from | Merge into | Lifetime |
| --- | --- | --- | --- |
| `main` | — | — | Permanent; released commits only |
| `develop` | `main` | — | Permanent; next-release integration |
| `feat/*`, `fix/*`, `docs/*`, `chore/*`, `codex/*` | `develop` | `develop` | Delete after merge |
| `release/vX.Y.Z` | `develop` | `main`, then synchronize `main` into `develop` | Delete after release |
| `hotfix/vX.Y.Z` | `main` | `main`, then synchronize `main` into `develop` | Delete after release |

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
   npm run test:package
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

7. The tag-triggered workflow creates a draft GitHub Release, publishes npm through OIDC, verifies the public package, and only then publishes the GitHub Release.
8. Synchronize `main` back into `develop` with a merge commit, then delete `release/vX.Y.Z` locally and remotely.

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
- Use merge commits for topic pull requests into `develop`, release/hotfix pull requests into `main`, and synchronization from `main` back into `develop`.

## Recovery

Record the previous known-good tag before publishing. If a release is defective, restore the npm `latest` dist-tag to that known-good version, deprecate the bad npm version, mark the GitHub Release clearly, and publish a corrected patch. Do not unpublish routinely, force-move tags, or rewrite shared history.
