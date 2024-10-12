#!/usr/bin/env node

import path from 'path';
import { Command } from 'commander';
import { scanSourceFiles } from './utils/scan.mjs';
import { generateWordDoc } from './utils/generate.mjs';

// Create a new instance of the Command class to define the CLI program
const program = new Command();

// Define the program name, description, and version
program
  .name('code-to-docx')
  .alias('c2d')  // code to docx
  .description('Extract code from specified directory and generate docx')
  .version('1.0.0')
  // Define required option for source directory
  .requiredOption('-s, --source <path>', 'Source directory to scan')
  // Define option for file types to scan
  .option('-t, --type <file types>', 'Comma-separated list of file types to scan, e.g. ".vue,.js"', '.vue,.js,.jsx,.ts,.tsx')
  // Define option for output file path
  .option('-o, --output <path>', 'Path to output docx file containing the extracted source code', 'output.docx');

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
    // Scan the source directory for files of the specified types and extract source code lines
    const allLines = await scanSourceFiles(options.source, fileTypes);
    // Calculate the total number of extracted lines
    const totalLines = allLines.length;

    // If no source lines are found, log a message and exit
    if (totalLines === 0) {
      console.log("No source lines found.");
      return;
    }

    // Generate a Word document containing the extracted source code
    const filePath = await generateWordDoc(options.output, allLines);

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