"use strict";
/**
 * lib/storage.ts
 *
 * Supabase Storage client for file upload operations.
 *
 * Phase 4: upload files to the "workflow-files" bucket.
 * Returns a public URL that n8n can fetch directly.
 *
 * All storage operations go through this module — no raw
 * Supabase storage calls in route handlers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_FILE_SIZE_BYTES = exports.ALLOWED_MIME_TYPES = void 0;
exports.uploadFile = uploadFile;
exports.validateFile = validateFile;
exports.deleteFile = deleteFile;
const supabase_1 = require("./supabase");
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BUCKET = "workflow-files";
// Allowed MIME types — must match bucket policy in migration 002
exports.ALLOWED_MIME_TYPES = {
    "text/csv": ".csv",
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/msword": ".doc",
};
exports.MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Uploads a file buffer to Supabase Storage.
 * Generates a unique storage path to prevent filename collisions.
 * Returns the public URL and file metadata.
 *
 * @param buffer       - File contents as a Buffer
 * @param originalName - Original filename from the upload e.g. "data.csv"
 * @param mimeType     - MIME type e.g. "text/csv"
 * @param fileSize     - File size in bytes
 */
async function uploadFile(buffer, originalName, mimeType, fileSize) {
    const supabase = (0, supabase_1.getSupabaseClient)();
    // Sanitize filename — remove special chars, keep extension
    const sanitizedName = originalName
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .toLowerCase();
    // Unique path: timestamp + random suffix prevents collisions
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const storagePath = `uploads/${timestamp}_${randomSuffix}_${sanitizedName}`;
    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false, // never overwrite — unique paths guarantee this
    });
    if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
    }
    // Get the public URL — n8n fetches directly from this
    const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(storagePath);
    if (!urlData?.publicUrl) {
        throw new Error("Failed to get public URL after upload");
    }
    return {
        file_url: urlData.publicUrl,
        file_name: originalName,
        file_type: mimeType,
        file_size: fileSize,
        storage_path: storagePath,
    };
}
/**
 * Validates a file before upload.
 * Throws with a user-friendly message if validation fails.
 *
 * @param mimeType - MIME type to validate
 * @param fileSize - File size in bytes to validate
 */
function validateFile(mimeType, fileSize) {
    if (!exports.ALLOWED_MIME_TYPES[mimeType]) {
        const allowed = Object.values(exports.ALLOWED_MIME_TYPES).join(", ");
        throw new Error(`File type not supported: ${mimeType}. Allowed types: ${allowed}`);
    }
    if (fileSize > exports.MAX_FILE_SIZE_BYTES) {
        const maxMB = exports.MAX_FILE_SIZE_BYTES / (1024 * 1024);
        throw new Error(`File too large: ${(fileSize / (1024 * 1024)).toFixed(1)}MB. Maximum allowed: ${maxMB}MB`);
    }
}
/**
 * Deletes a file from storage by its storage path.
 * Used for cleanup if workflow execution fails after upload.
 * Never throws — deletion failure is logged but not fatal.
 *
 * @param storagePath - Path inside the bucket e.g. "uploads/123_abc_data.csv"
 */
async function deleteFile(storagePath) {
    try {
        const supabase = (0, supabase_1.getSupabaseClient)();
        const { error } = await supabase.storage
            .from(BUCKET)
            .remove([storagePath]);
        if (error) {
            console.error(`[storage] Failed to delete ${storagePath}: ${error.message}`);
        }
    }
    catch (err) {
        console.error(`[storage] Unexpected error deleting ${storagePath}: ${err instanceof Error ? err.message : String(err)}`);
    }
}
