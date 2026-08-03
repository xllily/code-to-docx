import fs from "fs";
import os from "os";
import path from "path";
import {
  createIsolatedNpmEnvironment,
  runCommand,
} from "./package-acceptance.mjs";

const SKILLS_CLI_VERSION = process.env.SKILLS_CLI_VERSION ?? "1.5.21";
if (SKILLS_CLI_VERSION !== "latest" && !/^\d+\.\d+\.\d+$/.test(SKILLS_CLI_VERSION)) {
  throw new Error("SKILLS_CLI_VERSION must be latest or an exact SemVer version");
}
const SKILLS_AGENT = process.env.SKILLS_AGENT ?? "codex";
if (!/^[a-z0-9-]+$/.test(SKILLS_AGENT)) {
  throw new Error("SKILLS_AGENT must contain only lowercase letters, numbers, and hyphens");
}
const SKILLS_EXPECTED_ROOT = process.env.SKILLS_EXPECTED_ROOT ?? ".agents/skills";
if (path.isAbsolute(SKILLS_EXPECTED_ROOT) || SKILLS_EXPECTED_ROOT.split(/[\\/]+/).includes("..")) {
  throw new Error("SKILLS_EXPECTED_ROOT must be a relative path inside the test fixture");
}
const repositoryRoot = process.cwd();
const SKILLS_SOURCE = process.env.SKILLS_SOURCE ?? repositoryRoot;
if (!SKILLS_SOURCE.trim()) throw new Error("SKILLS_SOURCE must not be empty");
const SKILLS_VERIFY_LOCAL_VERSION = process.env.SKILLS_VERIFY_LOCAL_VERSION ?? "true";
if (!new Set(["true", "false"]).has(SKILLS_VERIFY_LOCAL_VERSION)) {
  throw new Error("SKILLS_VERIFY_LOCAL_VERSION must be true or false");
}
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
    SKILLS_SOURCE,
    "--skill", "code-to-docx",
    "--agent", SKILLS_AGENT,
    "--yes",
  ], { cwd: fixtureRoot, env: environment });

  const installedRoot = path.join(fixtureRoot, SKILLS_EXPECTED_ROOT, "code-to-docx");
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

  if (SKILLS_VERIFY_LOCAL_VERSION === "true") {
    const installedSkill = await fs.promises.readFile(path.join(installedRoot, "SKILL.md"), "utf8");
    const expectedFallback = `npx --yes ${packageManifest.name}@${packageManifest.version}`;
    if (!installedSkill.includes(expectedFallback)) {
      throw new Error(`Installed Skill does not use the release fallback: ${expectedFallback}`);
    }
  }

  process.stdout.write(
    `Skill install passed for ${SKILLS_AGENT} from ${SKILLS_SOURCE} with skills@${SKILLS_CLI_VERSION}: ${installedRoot}\n`,
  );
} finally {
  await fs.promises.rm(fixtureRoot, { recursive: true, force: true });
}
