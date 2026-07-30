import path from "path";
import { Command } from "commander";
import { version } from "./version.mjs";
import {
  DEFAULT_EXTENSIONS,
  ScanError,
  scanSourceFiles,
} from "./utils/scan.mjs";
import { generateWordDoc } from "./utils/generate.mjs";

class UsageError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function parseCsv(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function parsePositiveInteger(value, code, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new UsageError(code, `${label} must be a positive integer`);
  }
  return parsed;
}

function publicFile(file) {
  return {
    path: file.path,
    lines: file.lineCount,
    bytes: file.byteCount,
    sha256: file.sha256,
  };
}

function writeJson(stream, value) {
  stream.write(`${JSON.stringify(value, null, 2)}\n`);
}

function writeError(error, jsonRequested) {
  const payload = {
    ok: false,
    error: {
      code: error.code ?? "UNEXPECTED_ERROR",
      message: error.message,
    },
  };

  if (jsonRequested) writeJson(process.stderr, payload);
  else process.stderr.write(`Error [${payload.error.code}]: ${payload.error.message}\n`);
}

function createProgram() {
  return new Command()
    .name("code-to-docx")
    .alias("c2d")
    .description("Create a file-aware DOCX archive from source code")
    .version(version ?? process.env.npm_package_version, "-v, --version", "Output the current version")
    .requiredOption("-s, --source <path>", "Source directory to scan")
    .option("-t, --type <extensions>", "Comma-separated file extensions", DEFAULT_EXTENSIONS.join(","))
    .option("-o, --output <path>", "Output DOCX path", "output.docx")
    .option("-l, --lines-per-page <number>", "Source lines per page", "50")
    .option("-i, --ignored-dirs <patterns>", "Comma-separated directory names or glob patterns", "")
    .option("--ignored-files <patterns>", "Comma-separated file names or glob patterns", "")
    .option("--include-sensitive", "Allow files with sensitive-looking names", false)
    .option("--max-files <number>", "Maximum matching files", "1000")
    .option("--max-file-size <bytes>", "Maximum bytes per source file", "1000000")
    .option("--max-total-size <bytes>", "Maximum bytes across matching files", "25000000")
    .option("--dry-run", "Print the manifest without writing a DOCX", false)
    .option("--json", "Emit machine-readable JSON", false)
    .option("-p, --pure", "Omit line, byte, and SHA-256 metadata from the DOCX", false)
    .option("--quiet", "Suppress human-readable success output", false);
}

export async function runCli(argv = process.argv) {
  const jsonRequested = argv.includes("--json");
  const program = createProgram();
  let commanderError = "";
  program.exitOverride();
  program.configureOutput({
    writeOut: (message) => process.stdout.write(message),
    writeErr: (message) => { commanderError += message; },
  });

  try {
    program.parse(argv);
  } catch (error) {
    if (error.code === "commander.helpDisplayed" || error.code === "commander.version") return 0;
    writeError(new UsageError("INVALID_ARGUMENTS", commanderError.trim() || error.message), jsonRequested);
    return 2;
  }

  const options = program.opts();

  try {
    const linesPerPage = parsePositiveInteger(
      options.linesPerPage,
      "INVALID_LINES_PER_PAGE",
      "lines-per-page",
    );
    const scan = await scanSourceFiles(options.source, {
      extensions: parseCsv(options.type),
      ignoredDirs: parseCsv(options.ignoredDirs),
      ignoredFiles: parseCsv(options.ignoredFiles),
      includeSensitive: options.includeSensitive,
      maxFiles: parsePositiveInteger(options.maxFiles, "INVALID_MAX_FILES", "max-files"),
      maxFileSize: parsePositiveInteger(options.maxFileSize, "INVALID_MAX_FILE_SIZE", "max-file-size"),
      maxTotalSize: parsePositiveInteger(options.maxTotalSize, "INVALID_MAX_TOTAL_SIZE", "max-total-size"),
    });

    if (scan.files.length === 0) {
      throw new ScanError("NO_SOURCE_FILES", "No matching source files were found");
    }

    let generated;
    if (!options.dryRun) {
      generated = await generateWordDoc(options.output, scan.files, {
        linesPerPage,
        pure: options.pure,
      });
    }

    const payload = {
      ok: true,
      dryRun: options.dryRun,
      source: scan.source,
      output: path.resolve(options.output),
      outputBytes: generated?.bytes ?? 0,
      files: scan.files.map(publicFile),
      totals: scan.totals,
      skipped: scan.skipped,
      warnings: [],
    };

    if (options.json) {
      writeJson(process.stdout, payload);
    } else if (!options.quiet) {
      process.stdout.write(`${options.dryRun ? "Dry run complete" : "Document generated"}: ${payload.files.length} files, ${payload.totals.lines} lines\n`);
      for (const file of payload.files) process.stdout.write(`- ${file.path}\n`);
      if (!options.dryRun) process.stdout.write(`Output: ${payload.output} (${payload.outputBytes} bytes)\n`);
    }

    return 0;
  } catch (error) {
    writeError(error, options.json);
    if (error instanceof UsageError) return 2;
    if (error instanceof ScanError) return 3;
    return 4;
  }
}
