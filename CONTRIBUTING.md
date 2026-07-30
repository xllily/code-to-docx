# Contributing

Thanks for improving `code-to-docx`.

## Development

Requirements:

- Node.js 18 or newer
- npm

Set up and validate a change:

```sh
npm install
npm test
npm run test:package
node src/index.mjs --help
```

For behavior changes, add a failing test first, implement the smallest fix, and run the complete test suite. Keep CLI human output and `--json` output aligned.

## Pull requests

- Create `feat/*`, `fix/*`, `docs/*`, `chore/*`, and `codex/*` branches from `develop` and target `develop` with the pull request.
- Keep `main` and `develop` permanent. Do not commit directly to either branch.
- Use `release/vX.Y.Z` or `hotfix/vX.Y.Z` for the only pull requests that target `main`.
- Use merge commits for pull requests so release and synchronization ancestry remains auditable.
- Delete temporary branches after merge. GitHub should automatically delete merged head branches; run `git fetch --prune` to remove stale local tracking refs.
- Keep each pull request focused on one problem.
- Explain the user-visible behavior and compatibility impact.
- Add tests for successful, invalid-input, and failure paths where applicable.
- Update the README and Agent Skill when CLI flags or output fields change.
- Do not include generated DOCX files, credentials, or private source code.

By contributing, you agree that your contribution is licensed under the MIT License.

## Releases

See [RELEASING.md](RELEASING.md) for the complete branch, version, tagging, cleanup, hotfix, and rollback model.

The `publish.yml` workflow publishes a package version and finalizes its GitHub Release only when all of these conditions are true:

- an annotated SemVer tag such as `v1.4.0` points to a commit on `main`;
- the tag exactly matches the version in `package.json`;
- the version in `package.json` does not already exist on npm;
- unit tests and the clean-install package smoke test pass;
- npm accepts the workflow's short-lived OIDC credential.

Before merging the first release-enabled pull request, configure the npm package's trusted publisher with:

- provider: GitHub Actions;
- organization or user: `xllily`;
- repository: `code-to-docx`;
- workflow filename: `publish.yml`;
- allowed action: `npm publish`.

No `NPM_TOKEN` secret is required. A push to `main` alone never publishes; publishing begins only when the verified annotated tag is pushed.
