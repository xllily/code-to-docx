import fs from "fs";
import os from "os";
import path from "path";
import {
  createIsolatedNpmEnvironment,
  runCommand,
} from "./package-acceptance.mjs";

const SKILLS_CLI_VERSION = "1.5.21";
const repositoryRoot = process.cwd();
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const packageManifest = JSON.parse(await fs.promises.readFile(
  path.join(repositoryRoot, "package.json"),
  "utf8",
));
const fixtureRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "code-to-docx-skill-install-"));

try {
  const environment = await createIsolatedNpmEnvironment(fixtureRoot);
  runCommand(npxCommand, [
    "--yes",
    `skills@${SKILLS_CLI_VERSION}`,
    "add",
    repositoryRoot,
    "--skill", "code-to-docx",
    "--agent", "codex",
    "--yes",
  ], { cwd: fixtureRoot, env: environment });

  const installedRoot = path.join(fixtureRoot, ".agents", "skills", "code-to-docx");
  const requiredFiles = [
    "SKILL.md",
    "agents/openai.yaml",
    "references/cli-contract.md",
    "scripts/verify-output.mjs",
  ];

  for (const relativePath of requiredFiles) {
    const stat = await fs.promises.stat(path.join(installedRoot, relativePath));
    if (!stat.isFile()) throw new Error(`Installed Skill file is missing: ${relativePath}`);
  }

  const installedSkill = await fs.promises.readFile(path.join(installedRoot, "SKILL.md"), "utf8");
  const expectedFallback = `npx --yes ${packageManifest.name}@${packageManifest.version}`;
  if (!installedSkill.includes(expectedFallback)) {
    throw new Error(`Installed Skill does not use the release fallback: ${expectedFallback}`);
  }

  process.stdout.write(`Skill install passed with skills@${SKILLS_CLI_VERSION}: ${installedRoot}\n`);
} finally {
  await fs.promises.rm(fixtureRoot, { recursive: true, force: true });
}
