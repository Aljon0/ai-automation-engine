"use strict";
/**
 * routes/upload.ts
 *
 * POST /api/upload
 *
 * Accepts a multipart/form-data file upload, validates it,
 * uploads to Supabase Storage, and returns file metadata.
 *
 * The frontend calls this first, gets back a file_url,
 * then includes that url in POST /api/tasks.
 *
 * Flow:
 * 1. Multer parses the multipart request into memory
 * 2. Validate file type and size
 * 3. Upload buffer to Supabase Storage
 * 4. Return public URL + metadata
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const storage_1 = require("../lib/storage");
exports.uploadRouter = (0, express_1.Router)();
// ---------------------------------------------------------------------------
// Multer config — memory storage, limits enforced before our validation
// ---------------------------------------------------------------------------
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: storage_1.MAX_FILE_SIZE_BYTES,
        files: 1,
    },
    fileFilter: (_req, file, cb) => {
        if (storage_1.ALLOWED_MIME_TYPES[file.mimetype]) {
            cb(null, true);
        }
        else {
            cb(new Error(`File type not supported: ${file.mimetype}. ` +
                `Allowed: ${Object.values(storage_1.ALLOWED_MIME_TYPES).join(", ")}`));
        }
    },
});
// ---------------------------------------------------------------------------
// POST /api/upload
// ---------------------------------------------------------------------------
exports.uploadRouter.post("/", (req, res, next) => {
    upload.single("file")(req, res, (err) => {
        if (err instanceof multer_1.default.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                res.status(413).json({
                    error: "File too large",
                    message: `Maximum file size is ${storage_1.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`,
                });
                return;
            }
            res.status(400).json({ error: "Upload error", message: err.message });
            return;
        }
        if (err) {
            res.status(400).json({ error: "Upload error", message: err.message });
            return;
        }
        next();
    });
}, async (req, res) => {
    if (!req.file) {
        res.status(400).json({
            error: "No file provided",
            message: 'Include a file in the "file" field of your multipart request.',
        });
        return;
    }
    const { buffer, originalname, mimetype, size } = req.file;
    try {
        (0, storage_1.validateFile)(mimetype, size);
        console.log(`[upload] Uploading "${originalname}" (${(size / 1024).toFixed(1)}KB, ${mimetype})`);
        const uploaded = await (0, storage_1.uploadFile)(buffer, originalname, mimetype, size);
        console.log(`[upload] Uploaded to: ${uploaded.storage_path}`);
        const body = {
            file_url: uploaded.file_url,
            file_name: uploaded.file_name,
            file_type: uploaded.file_type,
            file_size: uploaded.file_size,
        };
        res.status(200).json(body);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        console.error(`[upload] Error: ${message}`);
        res.status(400).json({ error: "Upload failed", message });
    }
});
