#!/usr/bin/env node

import fs from "fs";
import path from "path";

class VerificationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_FILE_SIGNATURE = 0x02014b50;
const LOCAL_FILE_SIGNATURE = 0x04034b50;
const END_OF_CENTRAL_DIRECTORY_SIZE = 22;
const MAX_ZIP_COMMENT_SIZE = 0xffff;
const CENTRAL_DIRECTORY_FILE_SIZE = 46;

function invalidZip(filePath, detail) {
  return new VerificationError(
    "INVALID_DOCX_ZIP",
    `Output is not a structurally valid DOCX ZIP file (${detail}): ${filePath}`,
  );
}

function findEndOfCentralDirectory(archive, filePath) {
  if (archive.length < END_OF_CENTRAL_DIRECTORY_SIZE) {
    throw invalidZip(filePath, "missing end-of-central-directory record");
  }

  const firstPossibleOffset = Math.max(
    0,
    archive.length - END_OF_CENTRAL_DIRECTORY_SIZE - MAX_ZIP_COMMENT_SIZE,
  );

  for (let offset = archive.length - END_OF_CENTRAL_DIRECTORY_SIZE; offset >= firstPossibleOffset; offset -= 1) {
    if (archive.readUInt32LE(offset) !== END_OF_CENTRAL_DIRECTORY_SIGNATURE) continue;

    const commentLength = archive.readUInt16LE(offset + 20);
    if (offset + END_OF_CENTRAL_DIRECTORY_SIZE + commentLength === archive.length) {
      return offset;
    }
  }

  throw invalidZip(filePath, "missing end-of-central-directory record");
}

function listZipEntries(archive, filePath) {
  const endOffset = findEndOfCentralDirectory(archive, filePath);
  const diskNumber = archive.readUInt16LE(endOffset + 4);
  const centralDirectoryDisk = archive.readUInt16LE(endOffset + 6);
  const entriesOnDisk = archive.readUInt16LE(endOffset + 8);
  const entryCount = archive.readUInt16LE(endOffset + 10);
  const centralDirectorySize = archive.readUInt32LE(endOffset + 12);
  const centralDirectoryOffset = archive.readUInt32LE(endOffset + 16);

  if (diskNumber !== 0 || centralDirectoryDisk !== 0 || entriesOnDisk !== entryCount) {
    throw invalidZip(filePath, "multi-disk ZIP archives are unsupported");
  }
  if (entryCount === 0xffff || centralDirectorySize === 0xffffffff || centralDirectoryOffset === 0xffffffff) {
    throw invalidZip(filePath, "ZIP64 archives are unsupported");
  }

  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;
  if (centralDirectoryEnd > endOffset) {
    throw invalidZip(filePath, "central directory is outside the archive bounds");
  }

  const entries = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (
      offset + CENTRAL_DIRECTORY_FILE_SIZE > centralDirectoryEnd
      || archive.readUInt32LE(offset) !== CENTRAL_DIRECTORY_FILE_SIGNATURE
    ) {
      throw invalidZip(filePath, "malformed central directory entry");
    }

    const compressedSize = archive.readUInt32LE(offset + 20);
    const fileNameLength = archive.readUInt16LE(offset + 28);
    const extraFieldLength = archive.readUInt16LE(offset + 30);
    const fileCommentLength = archive.readUInt16LE(offset + 32);
    const localHeaderOffset = archive.readUInt32LE(offset + 42);
    const fileNameStart = offset + CENTRAL_DIRECTORY_FILE_SIZE;
    const fileNameEnd = fileNameStart + fileNameLength;
    const entryEnd = fileNameEnd + extraFieldLength + fileCommentLength;

    if (entryEnd > centralDirectoryEnd || localHeaderOffset + 30 > centralDirectoryOffset) {
      throw invalidZip(filePath, "central directory entry points outside the archive bounds");
    }
    if (archive.readUInt32LE(localHeaderOffset) !== LOCAL_FILE_SIGNATURE) {
      throw invalidZip(filePath, "missing local file header");
    }

    const localFileNameLength = archive.readUInt16LE(localHeaderOffset + 26);
    const localExtraFieldLength = archive.readUInt16LE(localHeaderOffset + 28);
    const localFileNameStart = localHeaderOffset + 30;
    const localFileNameEnd = localFileNameStart + localFileNameLength;
    const fileDataEnd = localFileNameEnd + localExtraFieldLength + compressedSize;

    if (fileDataEnd > centralDirectoryOffset) {
      throw invalidZip(filePath, "file data points outside the archive bounds");
    }

    const fileName = archive.subarray(fileNameStart, fileNameEnd).toString("utf8");
    const localFileName = archive.subarray(localFileNameStart, localFileNameEnd).toString("utf8");
    if (fileName !== localFileName) {
      throw invalidZip(filePath, "local and central directory names do not match");
    }

    entries.push(fileName);
    offset = entryEnd;
  }

  if (offset !== centralDirectoryEnd) {
    throw invalidZip(filePath, "central directory size does not match its entries");
  }

  return entries;
}

function parseArguments(argv) {
  const [filePath, flag, expectedBytesValue, ...rest] = argv;
  if (!filePath || rest.length > 0 || (flag && flag !== "--expected-bytes")) {
    throw new VerificationError(
      "INVALID_ARGUMENTS",
      "Usage: node scripts/verify-output.mjs <output.docx> [--expected-bytes <number>]",
    );
  }

  let expectedBytes;
  if (flag) {
    expectedBytes = Number(expectedBytesValue);
    if (!Number.isInteger(expectedBytes) || expectedBytes < 1) {
      throw new VerificationError("INVALID_EXPECTED_BYTES", "expected-bytes must be a positive integer");
    }
  }

  return { filePath: path.resolve(filePath), expectedBytes };
}

async function verify(filePath, expectedBytes) {
  let stat;
  try {
    stat = await fs.promises.stat(filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new VerificationError("FILE_NOT_FOUND", `Output does not exist: ${filePath}`);
    }
    throw error;
  }

  if (!stat.isFile() || stat.size === 0) {
    throw new VerificationError("EMPTY_OUTPUT", `Output is not a nonempty file: ${filePath}`);
  }
  if (expectedBytes !== undefined && stat.size !== expectedBytes) {
    throw new VerificationError(
      "SIZE_MISMATCH",
      `Expected ${expectedBytes} bytes but found ${stat.size}: ${filePath}`,
    );
  }

  const archive = await fs.promises.readFile(filePath);
  const signature = archive.subarray(0, 4);

  const isZip = signature[0] === 0x50 && signature[1] === 0x4b && [0x03, 0x05, 0x07].includes(signature[2]);
  if (!isZip) {
    throw new VerificationError("INVALID_DOCX_SIGNATURE", `Output is not a DOCX-compatible ZIP file: ${filePath}`);
  }

  const archiveEntries = new Set(listZipEntries(archive, filePath));
  const requiredParts = ["[Content_Types].xml", "word/document.xml"];
  const missingParts = requiredParts.filter((part) => !archiveEntries.has(part));
  if (missingParts.length > 0) {
    throw new VerificationError(
      "MISSING_DOCX_PARTS",
      `Output is missing required DOCX parts (${missingParts.join(", ")}): ${filePath}`,
    );
  }

  return { ok: true, path: filePath, bytes: stat.size, signature: "docx" };
}

try {
  const { filePath, expectedBytes } = parseArguments(process.argv.slice(2));
  const result = await verify(filePath, expectedBytes);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({
    ok: false,
    error: {
      code: error.code ?? "VERIFICATION_FAILED",
      message: error.message,
    },
  }, null, 2)}\n`);
  process.exitCode = 1;
}
