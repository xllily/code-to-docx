import fs from "fs";
import path from "path";
import {
  acceptPackage,
  EXACT_VERSION_PATTERN,
  normalizeRepositoryUrl,
} from "./package-acceptance.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const expectedVersion = argument("--version");
const expectedSha = argument("--expected-sha")?.toLowerCase();
if (!expectedVersion || !EXACT_VERSION_PATTERN.test(expectedVersion)) {
  throw new Error("--version must be an exact SemVer version; tags and ranges are not accepted");
}
if (!expectedSha || !/^[a-f0-9]{40}$/.test(expectedSha)) {
  throw new Error("--expected-sha must be the exact 40-character release commit SHA");
}

const packageManifest = JSON.parse(await fs.promises.readFile(path.resolve("package.json"), "utf8"));
const expectedRepository = normalizeRepositoryUrl(packageManifest.repository.url);
const expectedWorkflowPath = ".github/workflows/publish.yml";
const result = await acceptPackage({
  packageSpec: `${packageManifest.name}@${expectedVersion}`,
  packageName: packageManifest.name,
  expectedVersion,
  provenance: {
    expectedRepository,
    expectedWorkflowPath,
    expectedSha,
  },
});

process.stdout.write(`${JSON.stringify({
  ...result,
  commit: expectedSha,
  repository: expectedRepository,
  workflow: expectedWorkflowPath,
}, null, 2)}\n`);
