
import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import { generateWordDoc } from "./generate.mjs";

/**
 * Test to check if the generated docx file contains all expected lines.
 */
test("Check if generated docx contains all expected lines", async () => {
    // Define the output file path
    const outputFilePath = path.join(__dirname, "test_output.docx");

    // Define the expected code lines
    const expectedLines = [
        "const x = 10;",
        "function test() {",
        "console.log(x);",
        "}",
    ];

    // Generate the .docx file
    console.log("Generating docx file at:", outputFilePath);
    await generateWordDoc(outputFilePath, expectedLines);
    console.log("Docx file generated successfully.");

    // Read the .docx file content and convert it to plain text
    console.log("Reading generated docx file...");
    const buffer = await fs.promises.readFile(outputFilePath);
    const result = await mammoth.extractRawText({ buffer });
    console.log("Docx content extracted successfully.");
    const docxContent = result.value;

    // Split the document content into each line, and remove blank lines and extra spaces
    const lines = docxContent.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    console.log('docxContent lines:', lines);

    // Verify that each expected code line is in the generated .docx file
    console.log("Validating lines in the generated docx file...");
    expectedLines.forEach(line => {
        expect(lines).toContain(line);
    });

    // Clean up the generated test file
    console.log("Cleaning up: removing generated test file...");
    await fs.promises.unlink(outputFilePath);
    console.log("Test file removed successfully.");
});
