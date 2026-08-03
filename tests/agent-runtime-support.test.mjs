import {
  AGENT_RUNTIMES,
  fallbackCommandFromSkill,
  getRuntime,
  parsePrefixArgs,
  runtimeEnvironment,
  runtimeInvocation,
  runtimePrompt,
} from "./agent-runtime-support.mjs";

describe("real Agent runtime smoke support", () => {
  test("defines only official headless Agent runtimes", () => {
    expect(Object.keys(AGENT_RUNTIMES)).toEqual([
      "codex",
      "claude-code",
    ]);
    expect(getRuntime("claude-code")).toMatchObject({
      executable: "claude",
      installerAgent: "claude-code",
      expectedRoot: ".claude/skills",
      credentialEnv: "ANTHROPIC_API_KEY",
      skillInvocation: "/code-to-docx",
    });
    expect(() => getRuntime("trae")).toThrow("Unsupported AGENT_RUNTIME trae");
  });

  test("builds an invocation without putting credentials in arguments", () => {
    const prompt = runtimePrompt();
    const invocation = runtimeInvocation("codex", {
      executable: "npx",
      prefixArgs: ["--yes", "@openai/codex@latest"],
      prompt,
    });

    expect(invocation.executable).toBe("npx");
    expect(invocation.args).toEqual(expect.arrayContaining([
      "--yes",
      "@openai/codex@latest",
      "exec",
      "--ephemeral",
      "read-only",
      "--ignore-user-config",
      prompt,
    ]));
    expect(invocation.timeout).toBe(180_000);
  });

  test("parses safe command prefixes and rejects non-string values", () => {
    expect(parsePrefixArgs('["--yes","@openai/codex@latest"]')).toEqual([
      "--yes",
      "@openai/codex@latest",
    ]);
    expect(() => parsePrefixArgs("not-json")).toThrow("JSON array of strings");
    expect(() => parsePrefixArgs('["--yes",42]')).toThrow("JSON array of strings");
  });

  test("extracts the black-box assertion from the installed Skill", () => {
    expect(fallbackCommandFromSkill("Use npx --yes code-to-docx@1.3.2 only when allowed.")).toBe(
      "npx --yes code-to-docx@1.3.2",
    );
    expect(() => fallbackCommandFromSkill("npx code-to-docx@latest")).toThrow(
      "no exact versioned npx fallback",
    );
  });

  test("maps a generic CI credential to the Agent's official variable", () => {
    const environment = runtimeEnvironment("claude-code", { PATH: "/bin" }, "secret-value");
    expect(environment).toEqual({ PATH: "/bin", ANTHROPIC_API_KEY: "secret-value" });
    expect(environment.OPENAI_API_KEY).toBeUndefined();
  });
});
