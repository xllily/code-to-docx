import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

const repositoryRoot = process.cwd();
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repositoryRoot,
    encoding: "utf8",
    env: options.env ?? process.env,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error([
      `Command failed (${result.status}): ${command} ${args.join(" ")}`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join("\n"));
  }

  return result;
}

function installedBin(installRoot, name) {
  const suffix = process.platform === "win32" ? ".cmd" : "";
  return path.join(installRoot, "node_modules", ".bin", `${name}${suffix}`);
}

const fixtureRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "code-to-docx-package-smoke-"));
const packRoot = path.join(fixtureRoot, "pack");
const installRoot = path.join(fixtureRoot, "install");
const sourceRoot = path.join(fixtureRoot, "source");
const outputPath = path.join(fixtureRoot, "artifacts", "smoke.docx");
const npmUserConfig = path.join(fixtureRoot, "empty.npmrc");
const npmEnvironment = { ...process.env };

for (const key of Object.keys(npmEnvironment)) {
  if (["npm_config_allow_scripts", "npm_config_ignore_scripts", "npm_config_userconfig"].includes(key.toLowerCase())) {
    delete npmEnvironment[key];
  }
}
npmEnvironment.npm_config_userconfig = npmUserConfig;

try {
  await fs.promises.mkdir(packRoot, { recursive: true });
  await fs.promises.mkdir(sourceRoot, { recursive: true });
  await fs.promises.writeFile(npmUserConfig, "");
  await fs.promises.writeFile(
    path.join(sourceRoot, "example.mjs"),
    "// package smoke fixture\nexport const ready = true;\n",
  );

  run(npmCommand, ["pack", "--json", "--pack-destination", packRoot], { env: npmEnvironment });
  const tarballs = (await fs.promises.readdir(packRoot)).filter((file) => file.endsWith(".tgz"));
  if (tarballs.length !== 1) {
    throw new Error(`Expected one packed tarball but found ${tarballs.length}`);
  }

  const tarballPath = path.join(packRoot, tarballs[0]);
  run(npmCommand, [
    "install",
    "--no-audit",
    "--no-fund",
    "--no-package-lock",
    "--prefix",
    installRoot,
    tarballPath,
  ], { env: npmEnvironment });

  const helpResult = run(installedBin(installRoot, "code-to-docx"), ["--help"]);
  if (!helpResult.stdout.includes("Create a file-aware DOCX archive")) {
    throw new Error("Installed code-to-docx binary did not return the expected help text");
  }

  const generateResult = run(installedBin(installRoot, "c2d"), [
    "--source", sourceRoot,
    "--type", ".mjs",
    "--output", outputPath,
    "--json",
  ]);
  const generated = JSON.parse(generateResult.stdout);
  if (!generated.ok || generated.outputBytes < 1 || generated.files.length !== 1) {
    throw new Error(`Installed c2d binary returned an invalid result: ${generateResult.stdout}`);
  }

  const verifierPath = path.join(
    installRoot,
    "node_modules",
    "code-to-docx",
    "skills",
    "code-to-docx",
    "scripts",
    "verify-output.mjs",
  );
  const verifyResult = run(process.execPath, [
    verifierPath,
    outputPath,
    "--expected-bytes",
    String(generated.outputBytes),
  ]);
  const verified = JSON.parse(verifyResult.stdout);
  if (!verified.ok || verified.signature !== "docx") {
    throw new Error(`Packaged verifier returned an invalid result: ${verifyResult.stdout}`);
  }

  process.stdout.write(`Package smoke passed: ${tarballs[0]} (${generated.outputBytes} DOCX bytes)\n`);
} finally {
  await fs.promises.rm(fixtureRoot, { recursive: true, force: true });
}
