"use strict";
/**
 * lib/extractor.ts
 *
 * Text extraction from uploaded files.
 * - PDF  → pdfjs-dist (proper ESM support)
 * - DOCX → mammoth (Word XML → clean plain text)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractText = extractText;
const mammoth_1 = __importDefault(require("mammoth"));
const pdfjs = __importStar(require("pdfjs-dist/legacy/build/pdf.js"));
const MAX_CHARS = 15000;
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
async function extractText(buffer, mimeType) {
    if (mimeType === "application/pdf") {
        return extractFromPdf(buffer);
    }
    if (mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType === "application/msword") {
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
async function extractFromPdf(buffer) {
    try {
        const uint8Array = new Uint8Array(buffer);
        const loadingTask = pdfjs.getDocument({ data: uint8Array });
        const pdf = await loadingTask.promise;
        const pageCount = pdf.numPages;
        const textParts = [];
        for (let i = 1; i <= pageCount; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items
                .map((item) => {
                const textItem = item;
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
    }
    catch (err) {
        throw new Error(`PDF extraction failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}
async function extractFromDocx(buffer) {
    try {
        const result = await mammoth_1.default.extractRawText({ buffer });
        if (result.messages.length > 0) {
            console.warn(`[extractor] DOCX warnings: ${result.messages.map((m) => m.message).join(", ")}`);
        }
        const raw = result.value ?? "";
        const truncated = raw.length > MAX_CHARS;
        const text = raw.slice(0, MAX_CHARS).trim();
        return {
            text: text || "No text content found in this DOCX file.",
            char_count: raw.length,
            truncated,
        };
    }
    catch (err) {
        throw new Error(`DOCX extraction failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}
async function extractFromText(buffer) {
    const raw = buffer.toString("utf-8");
    const truncated = raw.length > MAX_CHARS;
    const text = raw.slice(0, MAX_CHARS).trim();
    return {
        text: text || "File is empty.",
        char_count: raw.length,
        truncated,
    };
}
