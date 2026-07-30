# code-to-docx

[![CI](https://github.com/xllily/code-to-docx/actions/workflows/ci.yml/badge.svg)](https://github.com/xllily/code-to-docx/actions/workflows/ci.yml)
[![Downloads](https://img.shields.io/npm/dw/code-to-docx)](https://www.npmjs.com/package/code-to-docx)
[![npm version](https://img.shields.io/npm/v/code-to-docx)](https://www.npmjs.com/package/code-to-docx)
[![License](https://img.shields.io/npm/l/code-to-docx)](LICENSE)

Create an auditable Word archive from a source tree. `code-to-docx` preserves file boundaries, comments, indentation, and blank lines; embeds per-file SHA-256 hashes; and exposes deterministic JSON output for coding agents and automation.

## Why code-to-docx

- Generate a `.docx` handoff for review, teaching, delivery, compliance, or offline reading.
- Keep every source file in a named section instead of flattening files together.
- Preview the exact manifest with `--dry-run` before writing or sharing a document.
- Exclude common secret filenames and generated directories by default.
- Use stable exit codes and `--json` in agents, CI, and shell automation.

## Quick start

Run without a global install:

```sh
npx code-to-docx \
  --source ./src \
  --output ./artifacts/source-code.docx
```

Or install the CLI:

```sh
npm install --global code-to-docx
code-to-docx --source ./src --output ./artifacts/source-code.docx
```

Use the short alias `c2d` anywhere `code-to-docx` is shown.

## Agent and automation workflow

Preview first:

```sh
code-to-docx \
  --source ./src \
  --type .js,.mjs,.ts,.tsx \
  --ignored-files '*.test.mjs,*.spec.ts' \
  --output ./artifacts/source-code.docx \
  --dry-run \
  --json
```

Review the returned `files` and `skipped` arrays, then remove `--dry-run` to write the document. A successful JSON response has this shape:

```json
{
  "ok": true,
  "dryRun": false,
  "source": "/absolute/path/src",
  "output": "/absolute/path/artifacts/source-code.docx",
  "outputBytes": 14269,
  "files": [
    {
      "path": "index.mjs",
      "lines": 120,
      "bytes": 4280,
      "sha256": "..."
    }
  ],
  "totals": {
    "files": 1,
    "lines": 120,
    "bytes": 4280
  },
  "skipped": [],
  "warnings": []
}
```

Errors use the same JSON envelope on standard error and return a nonzero exit code.

## Agent Skill

This repository includes an open-standard Agent Skill in [`skills/code-to-docx`](skills/code-to-docx). Once published, compatible agents can install it from this repository; the Skill teaches the agent to preview the source manifest, run the CLI, and verify the generated artifact.

With a compatible `skills` installer:

```sh
npx skills add https://github.com/xllily/code-to-docx --skill code-to-docx
```

You can also copy `skills/code-to-docx` into the skills directory supported by your agent host.

## CLI reference

| Option | Purpose | Default |
| --- | --- | --- |
| `-s, --source <path>` | Source directory to scan | Required |
| `-t, --type <extensions>` | Comma-separated file extensions | Common source extensions |
| `-o, --output <path>` | DOCX output path | `output.docx` |
| `-l, --lines-per-page <number>` | Source lines per page | `50` |
| `-i, --ignored-dirs <patterns>` | Additional directory names or glob patterns | None |
| `--ignored-files <patterns>` | File names or glob patterns to exclude | None |
| `--include-sensitive` | Include sensitive-looking filenames | Disabled |
| `--max-files <number>` | Maximum matching files | `1000` |
| `--max-file-size <bytes>` | Maximum bytes per file | `1000000` |
| `--max-total-size <bytes>` | Maximum total source bytes | `25000000` |
| `--dry-run` | Return the manifest without writing DOCX | Disabled |
| `--json` | Emit machine-readable output | Disabled |
| `--quiet` | Suppress human-readable success output | Disabled |

Run `code-to-docx --help` for the current command reference.

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Document generated or dry run completed |
| `2` | Invalid CLI arguments or limits |
| `3` | Source scan failed or found no matching files |
| `4` | DOCX generation or output writing failed |

## Safety model

The CLI skips common credential filenames such as `.env`, private keys, keystores, and credential files. It also refuses symbolic links, limits input size, and ignores common dependency, build, cache, and VCS directories.

These controls reduce accidental disclosure; they are not a secret scanner. Always inspect `--dry-run --json` before sharing a document outside the source repository. `--include-sensitive` is an explicit override.

## Development

```sh
npm install
npm test
node src/index.mjs --help
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance and [SECURITY.md](SECURITY.md) for vulnerability reporting.

## License

MIT © xllily. See [LICENSE](LICENSE).
