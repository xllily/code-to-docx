---
name: code-to-docx
description: Use when the user wants source code, a codebase, or selected programming files exported to a Word or DOCX archive for review, handoff, teaching, compliance, submission, or offline reading.
---

# Code to DOCX

Use the `code-to-docx` CLI as the archive engine. Preview the exact manifest before writing, then verify the resulting DOCX; do not silently rebuild the workflow with ad hoc document scripts.

## Workflow

1. Resolve the source directory, output path, file extensions, and exclusions from the request. Keep the source inside the user-authorized scope. Quote paths and glob patterns.

2. Select the CLI in this order:
   - In the `code-to-docx` repository, run `node src/index.mjs`.
   - Otherwise, use an installed `code-to-docx` command.
   - If unavailable, run `npx --yes code-to-docx@1.3.0` only when network package execution is allowed.

   If none is available, report the dependency blocker. Do not substitute an unreviewed generator without the user's approval.

3. Run a dry preview with the requested filters:

   ```sh
   code-to-docx \
     --source "/path/to/source" \
     --output "/path/to/archive.docx" \
     --ignored-files '*.test.*,*.spec.*' \
     --dry-run \
     --json
   ```

   Use the selected CLI prefix from step 2. Confirm that `ok` is true and every entry in `files` belongs in the archive. Inspect `skipped` for surprising exclusions. Adjust filters and repeat until the manifest matches the request.

4. Run the identical command without `--dry-run`. Treat any nonzero exit status, `ok: false`, missing output, or zero `outputBytes` as failure.

5. From this skill directory, verify the artifact against the CLI result:

   ```sh
   node scripts/verify-output.mjs "/path/to/archive.docx" --expected-bytes OUTPUT_BYTES
   ```

   Finish only when the verifier returns `ok: true`.

6. Report the absolute output path, byte size, file and line totals, included relative paths, material exclusions, and security caveats. Do not claim that filename filtering proves the source is secret-free.

## Guardrails

- Keep `--include-sensitive` disabled unless the user explicitly requests those files and the destination is trusted.
- Use `--ignored-files` and `--ignored-dirs` rather than manually copying a subset after generation.
- Never infer success from process status alone when using an older CLI; require a nonempty verified DOCX.
- Preserve tests when requested. Exclude them only when the user asks for production source or a test-free handoff.
- Read [references/cli-contract.md](references/cli-contract.md) when handling a CLI failure, composing automation, or consuming JSON fields programmatically.

## Quick reference

| Need | Action |
| --- | --- |
| See current options | Run `code-to-docx --help` |
| Preview included files | Add `--dry-run --json` |
| Exclude tests | Add `--ignored-files '*.test.*,*.spec.*'` |
| Restrict languages | Add `--type .js,.mjs,.ts,.tsx` |
| Automate safely | Require exit `0`, `ok: true`, then run the verifier |
