const DEFAULT_TIMEOUT_MS = 180_000;

export const AGENT_RUNTIMES = Object.freeze({
  codex: {
    executable: "codex",
    installerAgent: "codex",
    expectedRoot: ".agents/skills",
    credentialEnv: "OPENAI_API_KEY",
    skillInvocation: "$code-to-docx",
    args: (prompt) => [
      "exec",
      "--ephemeral",
      "--sandbox", "read-only",
      "--skip-git-repo-check",
      "--ignore-user-config",
      "--color", "never",
      prompt,
    ],
  },
  "claude-code": {
    executable: "claude",
    installerAgent: "claude-code",
    expectedRoot: ".claude/skills",
    credentialEnv: "ANTHROPIC_API_KEY",
    skillInvocation: "/code-to-docx",
    args: (prompt) => [
      "-p",
      "--output-format", "text",
      "--permission-mode", "dontAsk",
      "--no-session-persistence",
      prompt,
    ],
  },
});

export function getRuntime(agent) {
  const runtime = AGENT_RUNTIMES[agent];
  if (!runtime) {
    throw new Error(
      `Unsupported AGENT_RUNTIME ${agent}; expected one of ${Object.keys(AGENT_RUNTIMES).join(", ")}`,
    );
  }
  return runtime;
}

export function parsePrefixArgs(value = "[]") {
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("AGENT_RUNTIME_PREFIX_ARGS must be a JSON array of strings");
  }
  if (!Array.isArray(parsed) || parsed.some((entry) => typeof entry !== "string")) {
    throw new Error("AGENT_RUNTIME_PREFIX_ARGS must be a JSON array of strings");
  }
  return parsed;
}

export function fallbackCommandFromSkill(skill) {
  const match = skill.match(/npx --yes [a-z0-9@/._-]+@\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/);
  if (!match) throw new Error("Installed Skill has no exact versioned npx fallback command");
  return match[0];
}

export function runtimePrompt(skillInvocation = "the code-to-docx skill") {
  return [
    `Invoke ${skillInvocation} for this request.`,
    "Do not run shell commands, modify files, or use the network.",
    "Read the Skill's CLI selection instructions and respond with only the complete npx fallback command from step 2.",
    "Do not add Markdown fences or explanation.",
  ].join(" ");
}

export function runtimeInvocation(agent, options = {}) {
  const runtime = getRuntime(agent);
  const executable = options.executable ?? runtime.executable;
  const prefixArgs = options.prefixArgs ?? [];
  return {
    executable,
    args: [...prefixArgs, ...runtime.args(options.prompt ?? runtimePrompt(runtime.skillInvocation))],
    timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
  };
}

export function runtimeEnvironment(agent, environment, genericApiKey) {
  const runtime = getRuntime(agent);
  if (!genericApiKey) return { ...environment };
  return { ...environment, [runtime.credentialEnv]: genericApiKey };
}
