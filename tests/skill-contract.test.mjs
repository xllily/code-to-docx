import fs from "fs";
import path from "path";

const repositoryRoot = process.cwd();
const packageManifest = JSON.parse(await fs.promises.readFile(
  path.join(repositoryRoot, "package.json"),
  "utf8",
));
const skillRoot = path.join(repositoryRoot, "skills", "code-to-docx");
const skill = await fs.promises.readFile(path.join(skillRoot, "SKILL.md"), "utf8");
const generatedVersion = await fs.promises.readFile(
  path.join(repositoryRoot, "src", "version.mjs"),
  "utf8",
);

describe("packaged Agent Skill contract", () => {
  test("pins the npx fallback to the package version", () => {
    expect(skill).toContain(`npx --yes ${packageManifest.name}@${packageManifest.version}`);
  });

  test("keeps the generated CLI version reproducible", () => {
    expect(generatedVersion).toBe(`export const version = '${packageManifest.version}';\n`);
  });

  test("ships every local file referenced by the workflow", async () => {
    const referencedPaths = [
      "agents/openai.yaml",
      "references/cli-contract.md",
      "scripts/verify-output.mjs",
    ];

    await expect(Promise.all(referencedPaths.map(async (relativePath) => {
      const stat = await fs.promises.stat(path.join(skillRoot, relativePath));
      return stat.isFile();
    }))).resolves.toEqual(referencedPaths.map(() => true));
  });
});
