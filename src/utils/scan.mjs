import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { fileURLToPath } from "url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const settingsPath = path.resolve(moduleDir, "../../app-settings.json");
const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));

export const DEFAULT_EXTENSIONS = [
  ".c", ".cc", ".cpp", ".cs", ".css", ".dart", ".go", ".h", ".hpp",
  ".html", ".java", ".js", ".jsx", ".kt", ".kts", ".mjs", ".cjs",
  ".php", ".py", ".rb", ".rs", ".scss", ".sh", ".sql", ".swift",
  ".ts", ".tsx", ".vue",
];

export const DEFAULT_IGNORED_DIRS = [...new Set([
  ...settings.scanIgnoredDirs,
  ".cache",
  ".idea",
  ".next",
  ".turbo",
  ".vscode",
  "coverage",
])];

export const SENSITIVE_FILE_PATTERNS = [
  ".env",
  ".env.*",
  "*.key",
  "*.keystore",
  "*.p12",
  "*.pem",
  "*.pfx",
  "credentials.json",
  "id_ed25519",
  "id_rsa",
  "secrets.*",
];

export class ScanError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "ScanError";
    this.code = code;
  }
}

function filesystemScanError(sourceRoot, error) {
  return new ScanError(
    "SOURCE_SCAN_FAILED",
    `Failed to scan source directory ${sourceRoot}: ${error.message}`,
    { cause: error },
  );
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function globToRegExp(pattern) {
  let expression = "^";

  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*") {
      if (pattern[index + 1] === "*") {
        expression += ".*";
        index += 1;
      } else {
        expression += "[^/]*";
      }
    } else if (character === "?") {
      expression += "[^/]";
    } else {
      expression += character.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
    }
  }

  return new RegExp(`${expression}$`, "i");
}

function matchesPattern(relativePath, pattern) {
  const normalizedPath = toPosixPath(relativePath);
  const matcher = globToRegExp(toPosixPath(pattern));
  return matcher.test(normalizedPath) || (!pattern.includes("/") && matcher.test(path.basename(normalizedPath)));
}

function matchesAny(relativePath, patterns) {
  return patterns.some((pattern) => matchesPattern(relativePath, pattern));
}

function countLines(content) {
  if (content.length === 0) return 0;
  const lines = content.split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
  return lines.length;
}

function positiveInteger(value, fallback, name) {
  const parsed = value ?? fallback;
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ScanError("INVALID_SCAN_OPTIONS", `${name} must be a positive integer`);
  }
  return parsed;
}

/**
 * Scan a directory and return deterministic, file-aware source records.
 */
export async function scanSourceFiles(sourceDir, options = {}) {
  const sourceRoot = path.resolve(sourceDir);
  const extensions = (options.extensions ?? DEFAULT_EXTENSIONS)
    .map((extension) => extension.startsWith(".") ? extension.toLowerCase() : `.${extension.toLowerCase()}`);
  const ignoredDirs = [...new Set([...DEFAULT_IGNORED_DIRS, ...(options.ignoredDirs ?? [])])];
  const ignoredFiles = options.ignoredFiles ?? [];
  const sensitivePatterns = options.includeSensitive ? [] : SENSITIVE_FILE_PATTERNS;
  const maxFiles = positiveInteger(options.maxFiles, 1000, "maxFiles");
  const maxFileSize = positiveInteger(options.maxFileSize, 1_000_000, "maxFileSize");
  const maxTotalSize = positiveInteger(options.maxTotalSize, 25_000_000, "maxTotalSize");

  let sourceStat;
  try {
    sourceStat = await fs.promises.stat(sourceRoot);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new ScanError("SOURCE_NOT_FOUND", `Source directory does not exist: ${sourceRoot}`);
    }
    throw filesystemScanError(sourceRoot, error);
  }

  if (!sourceStat.isDirectory()) {
    throw new ScanError("SOURCE_NOT_DIRECTORY", `Source path is not a directory: ${sourceRoot}`);
  }

  const files = [];
  const skipped = [];
  let totalBytes = 0;
  let totalLines = 0;

  async function visit(directory) {
    const entries = await fs.promises.readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => {
      if (left.name < right.name) return -1;
      if (left.name > right.name) return 1;
      return 0;
    });

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = toPosixPath(path.relative(sourceRoot, absolutePath));

      if (entry.isSymbolicLink()) {
        skipped.push({ path: relativePath, reason: "symbolic-link" });
        continue;
      }

      if (entry.isDirectory()) {
        if (matchesAny(relativePath, ignoredDirs) || ignoredDirs.includes(entry.name)) {
          skipped.push({ path: relativePath, reason: "ignored-directory" });
          continue;
        }
        await visit(absolutePath);
        continue;
      }

      if (!entry.isFile()) continue;
      if (matchesAny(relativePath, sensitivePatterns)) {
        skipped.push({ path: relativePath, reason: "sensitive-file" });
        continue;
      }
      if (matchesAny(relativePath, ignoredFiles)) {
        skipped.push({ path: relativePath, reason: "ignored-file" });
        continue;
      }
      if (!extensions.some((extension) => entry.name.toLowerCase().endsWith(extension))) {
        skipped.push({ path: relativePath, reason: "extension" });
        continue;
      }

      const stat = await fs.promises.stat(absolutePath);
      if (stat.size > maxFileSize) {
        skipped.push({ path: relativePath, reason: "max-file-size" });
        continue;
      }
      if (files.length >= maxFiles) {
        throw new ScanError("MAX_FILES_EXCEEDED", `Source contains more than ${maxFiles} matching files`);
      }
      if (totalBytes + stat.size > maxTotalSize) {
        throw new ScanError("MAX_TOTAL_SIZE_EXCEEDED", `Matching source exceeds ${maxTotalSize} bytes`);
      }

      const content = await fs.promises.readFile(absolutePath, "utf8");
      const lineCount = countLines(content);
      const byteCount = Buffer.byteLength(content);
      const sha256 = createHash("sha256").update(content).digest("hex");
      files.push({ path: relativePath, absolutePath, content, lineCount, byteCount, sha256 });
      totalBytes += byteCount;
      totalLines += lineCount;
    }
  }

  try {
    await visit(sourceRoot);
  } catch (error) {
    if (error instanceof ScanError) throw error;
    throw filesystemScanError(sourceRoot, error);
  }

  return {
    source: sourceRoot,
    files,
    skipped,
    totals: { files: files.length, lines: totalLines, bytes: totalBytes },
  };
}
