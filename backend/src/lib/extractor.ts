/**
 * lib/extractor.ts
 *
 * Text extraction from uploaded files.
 * - PDF  → pdfjs-dist (proper ESM support)
 * - DOCX → mammoth (Word XML → clean plain text)
 */

import mammoth from "mammoth";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractionResult {
  text: string;
  char_count: number;
  page_count?: number;
  truncated: boolean;
}

const MAX_CHARS = 15000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  if (mimeType === "application/pdf") {
    return extractFromPdf(buffer);
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    return extractFromDocx(buffer);
  }

  if (mimeType === "text/csv" || mimeType === "text/plain") {
    return extractFromText(buffer);
  }

  throw new Error(`Unsupported file type for extraction: ${mimeType}`);
}

// ---------------------------------------------------------------------------
// Extractors (private)
// ---------------------------------------------------------------------------

async function extractFromPdf(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;

    const pageCount = pdf.numPages;
    const textParts: string[] = [];

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: unknown) => {
          const textItem = item as { str?: string };
          return textItem.str ?? "";
        })
        .join(" ");
      textParts.push(pageText);
    }

    const raw = textParts.join("\n").trim();
    const truncated = raw.length > MAX_CHARS;
    const text = raw.slice(0, MAX_CHARS).trim();

    return {
      text: text || "No text content found in this PDF.",
      char_count: raw.length,
      page_count: pageCount,
      truncated,
    };
  } catch (err) {
    throw new Error(
      `PDF extraction failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

async function extractFromDocx(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });

    if (result.messages.length > 0) {
      console.warn(
        `[extractor] DOCX warnings: ${result.messages.map((m) => m.message).join(", ")}`
      );
    }

    const raw = result.value ?? "";
    const truncated = raw.length > MAX_CHARS;
    const text = raw.slice(0, MAX_CHARS).trim();

    return {
      text: text || "No text content found in this DOCX file.",
      char_count: raw.length,
      truncated,
    };
  } catch (err) {
    throw new Error(
      `DOCX extraction failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

async function extractFromText(buffer: Buffer): Promise<ExtractionResult> {
  const raw = buffer.toString("utf-8");
  const truncated = raw.length > MAX_CHARS;
  const text = raw.slice(0, MAX_CHARS).trim();

  return {
    text: text || "File is empty.",
    char_count: raw.length,
    truncated,
  };
}