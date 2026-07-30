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
  runCommand(npmCommand, ["pack", "--json", "--pack-destination", packRoot], {
    cwd: repositoryRoot,
    env: environment,
  });

  const tarballs = (await fs.promises.readdir(packRoot)).filter((file) => file.endsWith(".tgz"));
  if (tarballs.length !== 1) {
    throw new Error(`Expected one packed tarball but found ${tarballs.length}`);
  }

  const result = await acceptPackage({
    packageSpec: path.join(packRoot, tarballs[0]),
    packageName: packageManifest.name,
    expectedVersion: packageManifest.version,
  });
  process.stdout.write(`Package smoke passed: ${tarballs[0]} (${result.outputBytes} DOCX bytes)\n`);
} finally {
  await fs.promises.rm(fixtureRoot, { recursive: true, force: true });
}
