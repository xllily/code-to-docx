import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

const cliPath = path.resolve(process.cwd(), "src/index.mjs");
const permissionTest = process.platform === "win32" || process.getuid?.() === 0 ? test.skip : test;

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
  });
}

describe("code-to-docx CLI", () => {
  let fixtureRoot;

  beforeEach(async () => {
    fixtureRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "code-to-docx-cli-"));
    await fs.promises.mkdir(path.join(fixtureRoot, "src"), { recursive: true });
    await fs.promises.writeFile(path.join(fixtureRoot, "src", "main.mjs"), "// comment\nexport const answer = 42;\n");
    await fs.promises.writeFile(path.join(fixtureRoot, "src", "main.test.mjs"), "test('excluded', () => {});\n");
    await fs.promises.writeFile(path.join(fixtureRoot, ".env.mjs"), "export const secret = true;\n");
  });

  afterEach(async () => {
    await fs.promises.rm(fixtureRoot, { recursive: true, force: true });
  });

  test("dry-run emits a machine-readable manifest without writing a document", () => {
    const outputPath = path.join(fixtureRoot, "artifacts", "source.docx");
    const result = runCli([
      "--source", fixtureRoot,
      "--type", ".mjs",
      "--ignored-files", "*.test.mjs",
      "--output", outputPath,
      "--dry-run",
      "--json",
    ]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const payload = JSON.parse(result.stdout);
    expect(payload).toMatchObject({ ok: true, dryRun: true });
    expect(payload.files.map((file) => file.path)).toEqual(["src/main.mjs"]);
    expect(payload.files[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.skipped).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: ".env.mjs", reason: "sensitive-file" }),
    ]));
    expect(fs.existsSync(outputPath)).toBe(false);
  });

  test("creates and verifies a document while returning a JSON summary", () => {
    const outputPath = path.join(fixtureRoot, "artifacts", "source.docx");
    const result = runCli([
      "--source", fixtureRoot,
      "--type", ".mjs",
      "--ignored-files", "*.test.mjs",
      "--output", outputPath,
      "--json",
    ]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toMatchObject({
      ok: true,
      dryRun: false,
      output: path.resolve(outputPath),
    });
    expect(payload.outputBytes).toBeGreaterThan(0);
    expect(fs.statSync(outputPath).size).toBe(payload.outputBytes);
  });

  test("returns a scan error when the source directory does not exist", () => {
    const result = runCli([
      "--source", path.join(fixtureRoot, "missing"),
      "--json",
    ]);

    expect(result.status).toBe(3);
    expect(result.stdout).toBe("");
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      error: { code: "SOURCE_NOT_FOUND" },
    });
  });

  permissionTest("classifies source traversal permission failures as scan errors", async () => {
    const blockedDirectory = path.join(fixtureRoot, "blocked");
    await fs.promises.mkdir(blockedDirectory);
    await fs.promises.writeFile(path.join(blockedDirectory, "unreadable.mjs"), "export default true;\n");
    await fs.promises.chmod(blockedDirectory, 0o000);

    try {
      const result = runCli([
        "--source", fixtureRoot,
        "--type", ".mjs",
        "--dry-run",
        "--json",
      ]);

      expect(result.status).toBe(3);
      expect(JSON.parse(result.stderr)).toMatchObject({
        ok: false,
        error: { code: "SOURCE_SCAN_FAILED" },
      });
    } finally {
      await fs.promises.chmod(blockedDirectory, 0o700);
    }
  });

  test("returns a usage error for an invalid lines-per-page value", () => {
    const result = runCli([
      "--source", fixtureRoot,
      "--lines-per-page", "0",
      "--json",
    ]);

    expect(result.status).toBe(2);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      error: { code: "INVALID_LINES_PER_PAGE" },
    });
  });

  test("keeps the CLI entrypoint executable on POSIX", () => {
    if (process.platform === "win32") return;
    expect(fs.statSync(cliPath).mode & 0o111).not.toBe(0);
  });
});
