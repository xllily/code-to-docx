# CLI Contract

Load this reference when a command fails, when another tool consumes `code-to-docx` output, or when exact status semantics matter.

## Success

Use `--json` for automation. Success is the conjunction of:

- process exit status `0`;
- JSON field `ok` equal to `true`;
- `dryRun` matching the requested mode;
- a reviewed `files` manifest;
- for generation, `outputBytes` greater than zero and a passing `scripts/verify-output.mjs` result.

The success payload contains:

| Field | Meaning |
| --- | --- |
| `source` | Absolute scanned directory |
| `output` | Absolute requested DOCX path |
| `outputBytes` | Written bytes; zero during dry run |
| `files[]` | Relative path, line count, byte count, and SHA-256 per included file |
| `totals` | Included file, line, and source-byte totals |
| `skipped[]` | Relative path and exclusion reason |
| `warnings[]` | Nonfatal conditions |

## Failure

With `--json`, failure writes this envelope to standard error:

```json
{
  "ok": false,
  "error": {
    "code": "SOURCE_NOT_FOUND",
    "message": "Source directory does not exist: /path/to/source"
  }
}
```

| Exit | Class | Typical codes |
| --- | --- | --- |
| `2` | Usage | `INVALID_ARGUMENTS`, `INVALID_LINES_PER_PAGE`, invalid limits |
| `3` | Scan | `SOURCE_NOT_FOUND`, `SOURCE_NOT_DIRECTORY`, `SOURCE_SCAN_FAILED`, `NO_SOURCE_FILES`, limit exceeded |
| `4` | Generate/write | `UNEXPECTED_ERROR` or filesystem errors |

Do not retry usage errors unchanged. Correct scan paths or filters before retrying scan errors. For write failures, verify the parent location is writable and the output path is not a directory.

## Safety boundaries

The CLI excludes common credential filenames, symbolic links, dependencies, build products, caches, and VCS directories. It limits file count and input bytes. These are containment controls, not content-based secret detection.

Run `code-to-docx --help` for the authoritative option list rather than copying flags from this reference.
