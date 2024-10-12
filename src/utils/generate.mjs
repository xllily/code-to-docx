import fs from "fs";
import { Document, Packer, Paragraph } from "docx";

/**
 * Generates a Word document from source code lines.
 *
 * @param {string} filePath - The path where the Word document will be saved.
 * @param {string[]} sourceLines - An array of source code lines to be included in the document.
 */
async function generateWordDoc(filePath, sourceLines) {
  // Create a new Document with metadata.
  const doc = new Document({
    creator: "Code To Docx",
    title: "Extracted Source Code",
    description: "This document contains extracted source code.",
    sections: [
      {
        properties: {},
        children: sourceLines.map(line => new Paragraph(line)),
      },
    ],
  });

  // Convert the document to a buffer and write it to the specified file path.
  const buffer = await Packer.toBuffer(doc);
  await fs.promises.writeFile(filePath, buffer);
  return filePath
}

export { generateWordDoc };
