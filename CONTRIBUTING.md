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

- Keep each pull request focused on one problem.
- Explain the user-visible behavior and compatibility impact.
- Add tests for successful, invalid-input, and failure paths where applicable.
- Update the README and Agent Skill when CLI flags or output fields change.
- Do not include generated DOCX files, credentials, or private source code.

By contributing, you agree that your contribution is licensed under the MIT License.

## Releases

The `publish.yml` workflow publishes a package version only when all of these conditions are true:

- a commit reaches `main` in `xllily/code-to-docx`;
- the version in `package.json` does not already exist on npm;
- unit tests and the clean-install package smoke test pass;
- npm accepts the workflow's short-lived OIDC credential.

Before merging the first release-enabled pull request, configure the npm package's trusted publisher with:

- provider: GitHub Actions;
- organization or user: `xllily`;
- repository: `code-to-docx`;
- workflow filename: `publish.yml`;
- allowed action: `npm publish`.

No `NPM_TOKEN` secret is required. If trusted publishing is configured after a merge, run the **Publish npm package** workflow manually; already-published versions are detected and skipped.
