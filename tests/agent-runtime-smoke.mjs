import fs from "fs";
import os from "os";
import path from "path";
import {
  createIsolatedNpmEnvironment,
  runCommand,
} from "./package-acceptance.mjs";
import {
  fallbackCommandFromSkill,
  getRuntime,
  parsePrefixArgs,
  runtimeEnvironment,
  runtimeInvocation,
  runtimePrompt,
} from "./agent-runtime-support.mjs";

const repositoryRoot = process.cwd();
const agent = process.argv[2] ?? process.env.AGENT_RUNTIME ?? "codex";
const runtime = getRuntime(agent);
const skillsCliVersion = process.env.SKILLS_CLI_VERSION ?? "1.5.21";
const skillsSource = process.env.SKILLS_SOURCE ?? repositoryRoot;
const executable = process.env.AGENT_RUNTIME_COMMAND ?? runtime.executable;
const prefixArgs = parsePrefixArgs(process.env.AGENT_RUNTIME_PREFIX_ARGS);
const keepFixture = process.env.AGENT_RUNTIME_KEEP_FIXTURE === "true";
const fixtureRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), `code-to-docx-${agent}-runtime-`));
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

try {
  const baseEnvironment = await createIsolatedNpmEnvironment(fixtureRoot);
  const environment = runtimeEnvironment(
    agent,
    baseEnvironment,
    process.env.AGENT_RUNTIME_API_KEY,
  );
  runCommand("git", ["init", "--quiet"], { cwd: fixtureRoot, env: environment });

  runCommand(npxCommand, [
    "--yes",
    `skills@${skillsCliVersion}`,
    "add",
    skillsSource,
    "--skill", "code-to-docx",
    "--agent", runtime.installerAgent,
    "--yes",
  ], { cwd: fixtureRoot, env: environment });

  const installedSkillPath = path.join(
    fixtureRoot,
    runtime.expectedRoot,
    "code-to-docx",
    "SKILL.md",
  );
  const installedSkill = await fs.promises.readFile(installedSkillPath, "utf8");
  const expectedFallback = fallbackCommandFromSkill(installedSkill);
  const invocation = runtimeInvocation(agent, {
    executable,
    prefixArgs,
    prompt: runtimePrompt(runtime.skillInvocation),
  });
  const result = runCommand(invocation.executable, invocation.args, {
    cwd: fixtureRoot,
    env: environment,
    timeout: invocation.timeout,
  });
  const output = `${result.stdout}\n${result.stderr}`;

  if (!output.includes(expectedFallback)) {
    throw new Error([
      `${agent} ran successfully but did not return the installed Skill's fallback command.`,
      `Expected: ${expectedFallback}`,
      "Agent output:",
      output.trim(),
    ].join("\n"));
  }

  process.stdout.write(
    `Real Agent smoke passed for ${agent}: discovered and read ${installedSkillPath}\n`,
  );
} finally {
  if (keepFixture) {
    process.stderr.write(`Kept runtime fixture for inspection: ${fixtureRoot}\n`);
  } else {
    await fs.promises.rm(fixtureRoot, { recursive: true, force: true });
  }
}
