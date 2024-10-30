import fs from "fs";
import { Document, Packer, Paragraph, PageBreak } from "docx";

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
  // 存储所有段落的数组
  const paragraphs = [];

  // 遍历每一行，将其加入段落中，同时插入分页符
  for (let i = 0; i < sourceLines.length; i++) {
    paragraphs.push(new Paragraph(sourceLines[i]));

    // 当到达每页最后一行时，插入分页符（但不在最后一页插入）
    if ((i + 1) % linesPerPage === 0 && i !== sourceLines.length - 1) {
      paragraphs.push(new Paragraph({
        children: [new PageBreak()],
      }));
    }
  }

  // 创建包含所有段落的文档对象
  const doc = new Document({
    creator: "Code To Docx",
    title: "Extracted Source Code",
    description: "This document contains extracted source code.",
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  // 将文档转换为 buffer，并写入指定的文件路径
  const buffer = await Packer.toBuffer(doc);
  await fs.promises.writeFile(filePath, buffer);
  return filePath;
}



export { generateWordDoc };
