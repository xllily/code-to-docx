import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

export const PUBLIC_NPM_REGISTRY = "https://registry.npmjs.org";
export const EXACT_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;

export function normalizeRepositoryUrl(value) {
  return value.replace(/^git\+/, "").replace(/\.git$/, "");
}

export function runCommand(command, args, options = {}) {
  const useWindowsCommandShell = process.platform === "win32" && command.toLowerCase().endsWith(".cmd");
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    env: options.env ?? process.env,
    maxBuffer: 4 * 1024 * 1024,
    shell: useWindowsCommandShell,
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

export async function createIsolatedNpmEnvironment(root, baseEnvironment = process.env) {
  const userConfig = path.join(root, "empty.npmrc");
  const cache = path.join(root, "npm-cache");
  const environment = { ...baseEnvironment };

  for (const key of Object.keys(environment)) {
    const normalized = key.toLowerCase();
    if (normalized.startsWith("npm_config_") || normalized === "node_auth_token" || normalized === "npm_token") {
      delete environment[key];
    }
  }

  await fs.promises.mkdir(root, { recursive: true });
  await fs.promises.writeFile(userConfig, "");
  environment.npm_config_userconfig = userConfig;
  environment.npm_config_cache = cache;
  environment.npm_config_registry = PUBLIC_NPM_REGISTRY;
  environment.NO_UPDATE_NOTIFIER = "1";
  return environment;
}

function installedBin(installRoot, name) {
  const suffix = process.platform === "win32" ? ".cmd" : "";
  return path.join(installRoot, "node_modules", ".bin", `${name}${suffix}`);
}

function provenanceStatement(verifiedPackage) {
  const bundle = verifiedPackage.attestationBundles?.find(
    (candidate) => candidate.predicateType === "https://slsa.dev/provenance/v1",
  );
  if (!bundle?.bundle?.dsseEnvelope?.payload) {
    throw new Error("Published package has no SLSA provenance payload");
  }

  return JSON.parse(Buffer.from(bundle.bundle.dsseEnvelope.payload, "base64").toString("utf8"));
}

function verifyProvenance(auditResult, expectations) {
  const audit = JSON.parse(auditResult.stdout);
  if (audit.invalid?.length || audit.missing?.length) {
    throw new Error(`Registry signature audit failed: ${auditResult.stdout}`);
  }

  const verifiedPackage = audit.verified?.find(
    (candidate) => candidate.name === expectations.packageName
      && candidate.version === expectations.expectedVersion,
  );
  if (!verifiedPackage) {
    throw new Error(`Registry signature audit did not verify ${expectations.packageName}@${expectations.expectedVersion}`);
  }

  const provenance = provenanceStatement(verifiedPackage);
  const buildDefinition = provenance.predicate?.buildDefinition;
  const workflow = buildDefinition?.externalParameters?.workflow;
  const source = buildDefinition?.resolvedDependencies?.find((dependency) => dependency.digest?.gitCommit);
  if (workflow?.repository !== expectations.expectedRepository) {
    throw new Error(`Provenance repository ${workflow?.repository} does not match ${expectations.expectedRepository}`);
  }
  if (workflow?.path !== expectations.expectedWorkflowPath) {
    throw new Error(`Provenance workflow ${workflow?.path} does not match ${expectations.expectedWorkflowPath}`);
  }
  if (source?.digest?.gitCommit?.toLowerCase() !== expectations.expectedSha) {
    throw new Error(`Provenance commit ${source?.digest?.gitCommit} does not match ${expectations.expectedSha}`);
  }
}

export async function acceptPackage({
  packageSpec,
  packageName,
  expectedVersion,
  provenance,
}) {
  const fixtureRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "code-to-docx-acceptance-"));
  const installRoot = path.join(fixtureRoot, "install");
  const sourceRoot = path.join(fixtureRoot, "source");
  const outputPath = path.join(fixtureRoot, "artifacts", "acceptance.docx");
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  try {
    const environment = await createIsolatedNpmEnvironment(fixtureRoot);
    await fs.promises.mkdir(sourceRoot, { recursive: true });
    await fs.promises.writeFile(
      path.join(sourceRoot, "example.mjs"),
      "// package acceptance fixture\nexport const ready = true;\n",
    );

    runCommand(npmCommand, [
      "install",
      "--prefix", installRoot,
      "--no-audit",
      "--no-fund",
      "--save-exact",
      "--registry", PUBLIC_NPM_REGISTRY,
      packageSpec,
    ], { env: environment });

    const installedManifest = JSON.parse(await fs.promises.readFile(
      path.join(installRoot, "node_modules", packageName, "package.json"),
      "utf8",
    ));
    if (installedManifest.name !== packageName || installedManifest.version !== expectedVersion) {
      throw new Error(
        `Installed ${installedManifest.name}@${installedManifest.version}; expected ${packageName}@${expectedVersion}`,
      );
    }

    if (provenance) {
      const auditResult = runCommand(npmCommand, [
        "audit",
        "signatures",
        "--json",
        "--include-attestations",
        "--prefix", installRoot,
        "--registry", PUBLIC_NPM_REGISTRY,
      ], { env: environment });
      verifyProvenance(auditResult, {
        ...provenance,
        packageName,
        expectedVersion,
      });
    }

    const versionResult = runCommand(installedBin(installRoot, "code-to-docx"), ["--version"], {
      env: environment,
    });
    if (versionResult.stdout.trim() !== expectedVersion) {
      throw new Error(`Installed code-to-docx reported ${versionResult.stdout.trim()}; expected ${expectedVersion}`);
    }

    const helpResult = runCommand(installedBin(installRoot, "code-to-docx"), ["--help"], {
      env: environment,
    });
    if (!helpResult.stdout.includes("Create a file-aware DOCX archive")) {
      throw new Error("Installed code-to-docx binary did not return the expected help text");
    }

    const generateResult = runCommand(installedBin(installRoot, "c2d"), [
      "--source", sourceRoot,
      "--type", ".mjs",
      "--output", outputPath,
      "--json",
    ], { env: environment });
    const generated = JSON.parse(generateResult.stdout);
    if (!generated.ok || generated.outputBytes < 1 || generated.files.length !== 1) {
      throw new Error(`Installed c2d binary returned an invalid result: ${generateResult.stdout}`);
    }

    const verifierPath = path.join(
      installRoot,
      "node_modules",
      packageName,
      "skills",
      "code-to-docx",
      "scripts",
      "verify-output.mjs",
    );
    const verifyResult = runCommand(process.execPath, [
      verifierPath,
      outputPath,
      "--expected-bytes",
      String(generated.outputBytes),
    ], { env: environment });
    const verified = JSON.parse(verifyResult.stdout);
    if (!verified.ok || verified.signature !== "docx") {
      throw new Error(`Packaged verifier returned an invalid result: ${verifyResult.stdout}`);
    }

    return {
      ok: true,
      package: `${packageName}@${expectedVersion}`,
      outputBytes: generated.outputBytes,
      provenanceVerified: Boolean(provenance),
    };
  } finally {
    await fs.promises.rm(fixtureRoot, { recursive: true, force: true });
  }
}
