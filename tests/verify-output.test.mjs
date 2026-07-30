import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { createHash } from "crypto";
import { generateWordDoc } from "../src/utils/generate.mjs";

const verifierPath = path.resolve(
  process.cwd(),
  "skills/code-to-docx/scripts/verify-output.mjs",
);

function runVerifier(args) {
  return spawnSync(process.execPath, [verifierPath, ...args], { encoding: "utf8" });
}

async function generateFixture(docxPath) {
  const content = "export const answer = 42;\n";
  return generateWordDoc(docxPath, [{
    path: "src/example.mjs",
    content,
    lineCount: 1,
    byteCount: Buffer.byteLength(content),
    sha256: createHash("sha256").update(content).digest("hex"),
  }]);
}

function replaceArchiveName(archive, from, to) {
  if (from.length !== to.length) throw new Error("ZIP entry replacement names must have equal lengths");

  const updated = Buffer.from(archive);
  const original = Buffer.from(from);
  const replacement = Buffer.from(to);
  let offset = 0;
  let replacements = 0;

  while ((offset = updated.indexOf(original, offset)) !== -1) {
    replacement.copy(updated, offset);
    offset += replacement.length;
    replacements += 1;
  }

  if (replacements === 0) throw new Error(`ZIP entry was not found: ${from}`);
  return updated;
}

test("verifies a generated DOCX archive and expected size", async () => {
  const fixtureRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "code-to-docx-verify-"));
  const docxPath = path.join(fixtureRoot, "archive.docx");
  const generated = await generateFixture(docxPath);

  try {
    const result = runVerifier([docxPath, "--expected-bytes", String(generated.bytes)]);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      path: path.resolve(docxPath),
      bytes: generated.bytes,
      signature: "docx",
    });
  } finally {
    await fs.promises.rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("rejects a fake ZIP prefix containing DOCX part names", async () => {
  const fixtureRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "code-to-docx-verify-"));
  const zipPath = path.join(fixtureRoot, "fake.docx");
  await fs.promises.writeFile(zipPath, Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    Buffer.from("[Content_Types].xml\0word/document.xml"),
  ]));

  try {
    const result = runVerifier([zipPath]);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      error: { code: "INVALID_DOCX_ZIP" },
    });
  } finally {
    await fs.promises.rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("rejects a valid ZIP archive missing a required DOCX part", async () => {
  const fixtureRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "code-to-docx-verify-"));
  const docxPath = path.join(fixtureRoot, "missing-content-types.docx");
  await generateFixture(docxPath);
  const archive = await fs.promises.readFile(docxPath);
  await fs.promises.writeFile(
    docxPath,
    replaceArchiveName(archive, "[Content_Types].xml", "[Content_Types].txt"),
  );

  try {
    const result = runVerifier([docxPath]);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      error: { code: "MISSING_DOCX_PARTS" },
    });
  } finally {
    await fs.promises.rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("returns a structured error when the output is missing", () => {
  const missingPath = path.join(os.tmpdir(), "missing-code-to-docx-output.docx");
  const result = runVerifier([missingPath]);

  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(JSON.parse(result.stderr)).toMatchObject({
    ok: false,
    error: { code: "FILE_NOT_FOUND" },
  });
});
