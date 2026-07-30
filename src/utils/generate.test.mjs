
import fs from "fs";
import os from "os";
import path from "path";
import mammoth from "mammoth";
import { generateWordDoc } from "./generate.mjs";

test("writes file headings and complete source text to the DOCX", async () => {
  const fixtureRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "code-to-docx-generate-"));
  const outputFilePath = path.join(fixtureRoot, "nested", "output.docx");
  const sourceFiles = [
    {
      path: "src/alpha.js",
      content: "// alpha comment\nconst alpha = true;\n",
      lineCount: 2,
      byteCount: 37,
      sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
    {
      path: "src/beta.js",
      content: "const beta = false;\n",
      lineCount: 1,
      byteCount: 20,
      sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    },
  ];

  try {
    const generated = await generateWordDoc(outputFilePath, sourceFiles, { linesPerPage: 50 });
    const buffer = await fs.promises.readFile(outputFilePath);
    const result = await mammoth.extractRawText({ buffer });

    expect(generated).toMatchObject({ path: path.resolve(outputFilePath) });
    expect(generated.bytes).toBeGreaterThan(0);
    expect(result.value).toContain("src/alpha.js");
    expect(result.value).toContain("// alpha comment");
    expect(result.value).toContain("const alpha = true;");
    expect(result.value).toContain("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(result.value).toContain("src/beta.js");
    expect(result.value).toContain("const beta = false;");
  } finally {
    await fs.promises.rm(fixtureRoot, { recursive: true, force: true });
  }
});
