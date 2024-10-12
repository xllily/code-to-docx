import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const settingsPath = path.resolve(__dirname, "../../app-settings.json");
const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));

/**
 * Scans the source directory for files of specified types and extracts source code lines.
 *
 * @param {string} dir - The directory to scan for source files.
 * @param {string[]} fileTypes - An array of file types to scan, e.g., ['.vue', '.js', '.jsx', '.ts', '.tsx'].
 * @returns {Promise<string[]>} A promise that resolves to an array of extracted source code lines.
 */
export async function scanSourceFiles(dir, fileTypes) {
  const IGNORED_DIRS = settings.scanIgnoredDirs;

  let fileLines = [];
  const files = await fs.promises.readdir(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      if (IGNORED_DIRS.includes(file.name)) {
        console.log(`Skipping ignored directory: ${file.name}`);
        continue;
      }

      const subDirLines = await scanSourceFiles(fullPath, fileTypes);
      fileLines = fileLines.concat(subDirLines);
    } else if (file.isFile() && fileTypes.some(type => file.name.endsWith(type))) {
      const lines = await readLines(fullPath);
      const validLines = lines.filter(isSourceLine);
      fileLines = fileLines.concat(validLines);
    }
  }

  return fileLines;
}

/**
 * Reads the lines of a file asynchronously.
 *
 * @param {string} filePath - The path to the file to read.
 * @returns {Promise<string[]>} A promise that resolves to an array of lines in the file.
 */
async function readLines(filePath) {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  return content.split(/\r?\n/);
}

/**
 * Checks if a line is a source line by trimming and checking for comments.
 *
 * @param {string} line - The line to check.
 * @returns {boolean} True if the line is a source line, false otherwise.
 */
function isSourceLine(line) {
  const trimmed = line.trim();
  return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*');
}
