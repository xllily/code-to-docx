#!/usr/bin/env node

import path from 'path';
import { Command } from 'commander';
import { version } from './version.mjs';
import { scanSourceFiles } from './utils/scan.mjs';
import { generateWordDoc } from './utils/generate.mjs';

// Create a new instance of the Command class to define the CLI program
const program = new Command();

// Define the program name, description, and version
program
  .name('code-to-docx')
  .alias('c2d')  // code to docx
  .description('Extract code from specified directory and generate docx')
  .version(version ?? process.env.npm_package_version, '-v, --version', 'Output the current version')
  // Define required option for source directory
  .requiredOption('-s, --source <path>', 'Source directory to scan')
  // Define option for file types to scan
  .option('-t, --type <file types>', 'Comma-separated list of file types to scan, e.g. ".vue,.js"', '.vue,.js,.jsx,.ts,.tsx')
  // Define option for output file path
  .option('-o, --output <path>', 'Path to output docx file containing the extracted source code', 'output.docx')
  // Define option for lines per page in docx
  .option('-l, --lines-per-page <number>', 'Number of lines per page in the output docx file', 50)
  // Define option for ignored directories
  .option('-i, --ignored-dirs <directories>', 'Comma-separated list of directory names to ignore during scanning', '');

// Check if the version option is invoked explicitly
if (process.argv.includes('-v') || process.argv.includes('--version')) {
  console.log(program.version());  // Outputs only the version number
  process.exit();
}

// // Check if the version option is invoked explicitly
// if (process.argv.includes('-h') || process.argv.includes('--help')) {
//   program.outputHelp();
//   process.exit();
// }

// Parse the command line arguments
program.parse();

// Extract options from the parsed arguments
const options = program.opts();

/**
 * The main function that orchestrates the code extraction and document generation process.
 *
 * This function first parses the command line arguments to determine the source directory, file types to scan, and output file path.
 * It then scans the source directory for files of the specified types, extracts the source code lines, and generates a Word document containing the extracted code.
 *
 * @throws {Error} If an error occurs during the scanning or document generation process.
 */
async function main() {
  try {
    // Split and trim the file types option to get an array of file types
    const fileTypes = options.type.split(',').map(type => type.trim());
    console.log('fileTypes:', fileTypes);
    // Split and trim the dirs option to get an array of ignored dirs
    const ignoredDirs = options.ignoredDirs ? options.ignoredDirs.split(',').map(dir => dir.trim()) : [];
    console.log('ignoredDirs:', ignoredDirs);
    // Scan the source directory for files of the specified types and extract source code lines
    const allLines = await scanSourceFiles(options.source, fileTypes, ignoredDirs);
    // Calculate the total number of extracted lines
    const totalLines = allLines.length;

    // If no source lines are found, log a message and exit
    if (totalLines === 0) {
      console.log("No source lines found.");
      return;
    }

    // Generate a Word document containing the extracted source code
    const filePath = await generateWordDoc(options.output, allLines, options.linesPerPage);

    // Log success messages
    console.log("Document generated successfully.");
    console.log("Total source line count:", totalLines);
    console.log('See:', path.resolve(filePath))
  } catch (error) {
    // Log any errors that occur during the process
    console.error("An error occurred:", error);
  }
}

// Call the main function to start the program
main();

