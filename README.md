# code-to-docx — export source code to Word

[![CI](https://github.com/xllily/code-to-docx/actions/workflows/ci.yml/badge.svg)](https://github.com/xllily/code-to-docx/actions/workflows/ci.yml)
[![Downloads](https://img.shields.io/npm/dw/code-to-docx)](https://www.npmjs.com/package/code-to-docx)
[![npm version](https://img.shields.io/npm/v/code-to-docx)](https://www.npmjs.com/package/code-to-docx)
[![License](https://img.shields.io/npm/l/code-to-docx)](LICENSE)

`code-to-docx` is a command-line tool and Agent Skill that converts a source code directory into a structured Microsoft Word (`.docx`) document. It preserves file boundaries, comments, indentation, and blank lines so you can export a codebase to Word without copying files by hand.

By default, the generated source code archive records line counts, byte counts, and a SHA-256 hash for every file. Use `--pure` when the Word document should contain only file names and source code.

## Why code-to-docx

- Generate a `.docx` handoff for review, teaching, delivery, compliance, or offline reading.
- Keep every source file in a named section instead of flattening files together.
- Preview the exact manifest with `--dry-run` before writing or sharing a document.
- Exclude common secret filenames and generated directories by default.
- Use stable exit codes and `--json` in agents, CI, and shell automation.

## Common use cases

Use `code-to-docx` when you need to:

- convert source code to a Word document for delivery or submission;
- export an entire codebase to DOCX for offline review;
- create an auditable source code archive with per-file SHA-256 hashes;
- preserve source formatting and file boundaries in one document; or
- let Codex, Claude Code, Cursor, or another coding agent generate and verify a DOCX archive.

## Quick start

Choose the interface that matches how you work.

### Use the CLI

Run once without a global install:

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

### Install the Agent Skill

Install `code-to-docx` for the agents detected on your machine:

```sh
npx skills add xllily/code-to-docx --skill code-to-docx
```

Then start a new agent session and ask:

> Export the source files in `./src` to `./artifacts/source-code.docx`.

For agent-specific, global, local-clone, update, and verification commands, see [Install as an Agent Skill](#install-as-an-agent-skill).

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

## Install as an Agent Skill

This repository includes an open Agent Skill in [`skills/code-to-docx`](skills/code-to-docx). The Skill teaches compatible coding agents to:

1. preview and review the exact source manifest;
2. generate the DOCX with the supported CLI contract;
3. verify that the output is a nonempty DOCX containing the required package parts; and
4. report included files, exclusions, totals, and security caveats.

The Agent Skill and the CLI are complementary:

| Component | What it provides | How to install |
| --- | --- | --- |
| Agent Skill | The workflow, guardrails, and output verification instructions used by your agent | `npx skills add ...` |
| CLI | The `code-to-docx` / `c2d` executable that scans source and generates DOCX | `npm install --global code-to-docx` or run with `npx` |

The Skill can run the CLI through `npx` when package execution and network access are allowed. For repeat use, CI, or offline work, install the CLI separately.

### Install with the `skills` CLI

Interactive install for detected agents:

```sh
npx skills add xllily/code-to-docx --skill code-to-docx
```

Install globally for Codex:

```sh
npx skills add xllily/code-to-docx \
  --skill code-to-docx \
  --agent codex \
  --global \
  --yes
```

Install globally for Claude Code:

```sh
npx skills add xllily/code-to-docx \
  --skill code-to-docx \
  --agent claude-code \
  --global \
  --yes
```

Install globally for both Codex and Claude Code:

```sh
npx skills add xllily/code-to-docx \
  --skill code-to-docx \
  --agent codex \
  --agent claude-code \
  --global \
  --yes
```

Omit `--global` to install into the current project instead of your user-level agent configuration.

### Discover before installing

List the skills found in this repository:

```sh
npx skills add xllily/code-to-docx --list
```

You can also use the full GitHub URL:

```sh
npx skills add https://github.com/xllily/code-to-docx \
  --skill code-to-docx
```

### Install from a local clone

This is useful when testing a branch or local changes:

```sh
git clone https://github.com/xllily/code-to-docx.git
cd code-to-docx
npx skills add . --skill code-to-docx
```

### Verify or update the installation

```sh
# Show installed skills
npx skills list

# Show globally installed Codex skills
npx skills list --global --agent codex

# Update this skill when a new version is available
npx skills update code-to-docx
```

After installation, start a new session in your agent and try a concrete request:

> Use the code-to-docx skill to preview the TypeScript files in `./src`, exclude tests, export them to `./artifacts/source-code.docx`, and verify the result.

If your agent does not use the `skills` CLI, copy the complete [`skills/code-to-docx`](skills/code-to-docx) directory into the skills directory supported by that agent. Keep `SKILL.md`, `scripts/`, and `references/` together; the verifier and CLI contract are part of the workflow.

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
| `-p, --pure` | Omit line, byte, and SHA-256 metadata from the DOCX | Disabled |
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

## Frequently asked questions

### How do I convert source code to a Word document?

Run `npx code-to-docx --source ./src --output ./source-code.docx`. The CLI scans matching source files and writes them to a structured DOCX document with a separate section for each file.

### Can I export an entire codebase to DOCX?

Yes. Point `--source` at the project directory and use `--type`, `--ignored-dirs`, and `--ignored-files` to control the archive. Preview the exact file list with `--dry-run --json` before generating it.

### Does code-to-docx preserve source code formatting?

Yes. It preserves comments, indentation, blank lines, and file boundaries. The generated document uses a monospace font and labels every included file.

### Can coding agents use code-to-docx?

Yes. The repository includes an installable Agent Skill, stable exit codes, JSON output, manifest preview, and output verification instructions for agent and CI workflows.

### Does code-to-docx upload my source code?

No. The CLI reads local files and writes the DOCX locally. It does not upload source code to a hosted service. Review the [safety model](#safety-model) before sharing generated documents.

## Project links

- [Install code-to-docx from npm](https://www.npmjs.com/package/code-to-docx)
- [View the source and releases on GitHub](https://github.com/xllily/code-to-docx)
- [Report a bug or request a feature](https://github.com/xllily/code-to-docx/issues)

## Development

```sh
npm install
npm test
node src/index.mjs --help
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance and [SECURITY.md](SECURITY.md) for vulnerability reporting.

## License

MIT © xllily. See [LICENSE](LICENSE).
