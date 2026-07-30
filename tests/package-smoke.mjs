import fs from "fs";
import os from "os";
import path from "path";
import {
  acceptPackage,
  createIsolatedNpmEnvironment,
  runCommand,
} from "./package-acceptance.mjs";

const repositoryRoot = process.cwd();
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const packageManifest = JSON.parse(await fs.promises.readFile(path.join(repositoryRoot, "package.json"), "utf8"));
const fixtureRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "code-to-docx-package-smoke-"));
const packRoot = path.join(fixtureRoot, "pack");

try {
  const environment = await createIsolatedNpmEnvironment(fixtureRoot);
  await fs.promises.mkdir(packRoot, { recursive: true });
  const packResult = runCommand(npmCommand, ["pack", "--json", "--pack-destination", packRoot], {
    cwd: repositoryRoot,
    env: environment,
  });

  let packed;
  try {
    packed = JSON.parse(packResult.stdout);
  } catch (error) {
    throw new Error(`npm pack --json returned invalid JSON: ${packResult.stdout}`, { cause: error });
  }
  if (packed.length !== 1 || typeof packed[0]?.filename !== "string") {
    throw new Error(`Expected one packed tarball result: ${packResult.stdout}`);
  }
  const tarball = packed[0].filename;

  const result = await acceptPackage({
    packageSpec: path.join(packRoot, tarball),
    packageName: packageManifest.name,
    expectedVersion: packageManifest.version,
  });
  process.stdout.write(`Package smoke passed: ${tarball} (${result.outputBytes} DOCX bytes)\n`);
} finally {
  await fs.promises.rm(fixtureRoot, { recursive: true, force: true });
}
