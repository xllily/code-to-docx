import fs from "fs";
import path from "path";
import {
  acceptPackage,
  EXACT_VERSION_PATTERN,
} from "./package-acceptance.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const tarballArgument = argument("--tarball");
const expectedVersion = argument("--expected-version");
if (!tarballArgument) throw new Error("--tarball is required");
if (!expectedVersion || !EXACT_VERSION_PATTERN.test(expectedVersion)) {
  throw new Error("--expected-version must be an exact SemVer version");
}

const tarball = path.resolve(tarballArgument);
const stat = await fs.promises.stat(tarball);
if (!stat.isFile()) throw new Error(`Tarball is not a file: ${tarball}`);

const packageManifest = JSON.parse(await fs.promises.readFile(path.resolve("package.json"), "utf8"));
const result = await acceptPackage({
  packageSpec: tarball,
  packageName: packageManifest.name,
  expectedVersion,
});
process.stdout.write(`${JSON.stringify({ ...result, tarball }, null, 2)}\n`);
