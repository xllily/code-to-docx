import fs from "fs";
import os from "os";
import path from "path";
import { createHash } from "crypto";
import { spawnSync } from "child_process";
import { pathToFileURL } from "url";

const scanModuleUrl = pathToFileURL(path.resolve(process.cwd(), "src/utils/scan.mjs")).href;

function runScan(source, options) {
  const script = `
    import { scanSourceFiles } from ${JSON.stringify(scanModuleUrl)};
    try {
      const result = await scanSourceFiles(${JSON.stringify(source)}, ${JSON.stringify(options)});
      process.stdout.write(JSON.stringify({ ok: true, result }));
    } catch (error) {
      process.stdout.write(JSON.stringify({
        ok: false,
        error: { code: error.code, message: error.message },
      }));
      process.exitCode = 1;
    }
  `;

  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
    encoding: "utf8",
  });
  return { ...result, payload: JSON.parse(result.stdout) };
}

describe("scanSourceFiles", () => {
  let fixtureRoot;

  beforeEach(async () => {
    fixtureRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "code-to-docx-scan-"));
    await fs.promises.mkdir(path.join(fixtureRoot, "src"), { recursive: true });
    await fs.promises.mkdir(path.join(fixtureRoot, "vendor"), { recursive: true });
    await fs.promises.writeFile(
      path.join(fixtureRoot, "src", "main.js"),
      "// preserve this comment\nconst answer = 42;\n\n",
    );
    await fs.promises.writeFile(path.join(fixtureRoot, "src", "main.test.js"), "test('skip me', () => {});\n");
    await fs.promises.writeFile(path.join(fixtureRoot, ".env.js"), "const token = 'secret';\n");
    await fs.promises.writeFile(path.join(fixtureRoot, "vendor", "third-party.js"), "const vendor = true;\n");
  });

  afterEach(async () => {
    await fs.promises.rm(fixtureRoot, { recursive: true, force: true });
  });

  test("returns deterministic file-aware results and preserves source text", () => {
    const execution = runScan(fixtureRoot, {
      extensions: [".js"],
      ignoredDirs: ["vendor"],
      ignoredFiles: ["*.test.js"],
    });
    const result = execution.payload.result;

    expect(execution.status).toBe(0);
    expect(result.files.map((file) => file.path)).toEqual(["src/main.js"]);
    expect(result.files[0]).toMatchObject({
      content: "// preserve this comment\nconst answer = 42;\n\n",
      lineCount: 3,
      sha256: createHash("sha256")
        .update("// preserve this comment\nconst answer = 42;\n\n")
        .digest("hex"),
    });
    expect(result.totals).toMatchObject({ files: 1, lines: 3 });
    expect(result.skipped).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: ".env.js", reason: "sensitive-file" }),
      expect.objectContaining({ path: "src/main.test.js", reason: "ignored-file" }),
      expect.objectContaining({ path: "vendor", reason: "ignored-directory" }),
    ]));
  });

  test("stops when the file limit would be exceeded", () => {
    const execution = runScan(fixtureRoot, {
      extensions: [".js"],
      ignoredDirs: ["vendor"],
      ignoredFiles: [],
      includeSensitive: true,
      maxFiles: 1,
    });

    expect(execution.status).toBe(1);
    expect(execution.payload.error).toMatchObject({ code: "MAX_FILES_EXCEEDED" });
  });
});
