"use strict";
/**
 * routes/extract.ts
 *
 * POST /api/extract
 *
 * Called by n8n Document Processing workflow.
 * Downloads a file from Supabase Storage, extracts text,
 * and returns clean text ready for Groq processing.
 *
 * Flow:
 * 1. Validate request (file_url + file_type required)
 * 2. Download file buffer from Supabase public URL
 * 3. Extract text using mammoth (DOCX) or pdf-parse (PDF)
 * 4. Return clean text + metadata
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRouter = void 0;
const express_1 = require("express");
const extractor_1 = require("../lib/extractor");
exports.extractRouter = (0, express_1.Router)();
// ---------------------------------------------------------------------------
// POST /api/extract
// ---------------------------------------------------------------------------
exports.extractRouter.post("/", async (req, res) => {
    const { file_url, file_type, file_name } = req.body;
    // 1. Validate
    if (!file_url || typeof file_url !== "string") {
        res.status(400).json({
            error: "Validation failed",
            message: "file_url is required and must be a string",
        });
        return;
    }
    if (!file_type || typeof file_type !== "string") {
        res.status(400).json({
            error: "Validation failed",
            message: "file_type is required and must be a string",
        });
        return;
    }
    const fileName = typeof file_name === "string" ? file_name : "document";
    console.log(`[extract] Downloading: "${fileName}" (${file_type}) from ${file_url}`);
    try {
        // 2. Download file from Supabase Storage
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        let buffer;
        try {
            const response = await fetch(file_url, {
                signal: controller.signal,
            });
            if (!response.ok) {
                throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        }
        finally {
            clearTimeout(timeout);
        }
        console.log(`[extract] Downloaded ${(buffer.length / 1024).toFixed(1)}KB — extracting text`);
        // 3. Extract text
        const result = await (0, extractor_1.extractText)(buffer, file_type);
        console.log(`[extract] Extracted ${result.char_count} chars` +
            (result.truncated ? ` (truncated to ${result.text.length})` : ""));
        // 4. Return clean text
        const body = {
            text: result.text,
            file_name: fileName,
            file_type,
            char_count: result.char_count,
            truncated: result.truncated,
            ...(result.page_count !== undefined && {
                page_count: result.page_count,
            }),
        };
        res.status(200).json(body);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Extraction failed";
        console.error(`[extract] Error: ${message}`);
        res.status(500).json({ error: "Extraction failed", message });
    }
});
