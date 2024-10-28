import fs from "fs";
import { Document, Packer, Paragraph } from "docx";

/**
 * Generates a Word document from the given source lines and writes it to the specified file path.
 *
 * @async
 * @function generateWordDoc
 * @param {string} filePath - The file path where the generated Word document will be saved.
 * @param {string[]} sourceLines - An array of strings representing the lines of source code to include in the document.
 * @param {number} [linesPerPage=50] - The number of lines to include per page in the document.
 * @returns {Promise<string>} The file path where the document was saved.
 */
async function generateWordDoc(filePath, sourceLines, linesPerPage = 50) {
  // Split the source lines into chunks according to the linesPerPage parameter.
  const chunkedLines = [];
  for (let i = 0; i < sourceLines.length; i += linesPerPage) {
    chunkedLines.push(sourceLines.slice(i, i + linesPerPage));
  }

  // Create a new Document with metadata.
  const doc = new Document({
    creator: "Code To Docx",
    title: "Extracted Source Code",
    description: "This document contains extracted source code.",
    sections: chunkedLines.map(lines => ({
      properties: {},
      children: lines.map(line => new Paragraph(line)),
    })),
  });

  // Convert the document to a buffer and write it to the specified file path.
  const buffer = await Packer.toBuffer(doc);
  await fs.promises.writeFile(filePath, buffer);
  return filePath;
}

export { generateWordDoc };
