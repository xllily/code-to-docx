# Security Policy

## Supported versions

Security fixes are applied to the latest published version.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting for this repository when available. If it is unavailable, open an issue containing no sensitive exploit details and ask the maintainer for a private contact channel.

Do not attach private source archives, credentials, keys, or generated documents containing confidential code to a public issue.

## Source archive safety

`code-to-docx` excludes common credential filenames by default, but filename checks cannot prove that a source tree contains no secrets. Review the `--dry-run --json` manifest before sharing a generated document. Use `--include-sensitive` only when the destination and contents are trusted.
