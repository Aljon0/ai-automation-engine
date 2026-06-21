"use strict";
/**
 * middleware/rateLimit.ts
 *
 * Rate limiting for all API routes.
 * Different limits per route type:
 * - AI routes (tasks, extract): strict — 20 req/min
 * - Upload routes: moderate — 30 req/min
 * - Read routes (executions, analytics): lenient — 100 req/min
 * - Auth routes: strict — 10 req/min (brute force protection)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRateLimit = exports.readRateLimit = exports.uploadRateLimit = exports.aiRateLimit = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// ---------------------------------------------------------------------------
// Shared config
// ---------------------------------------------------------------------------
const standardHeaders = true; // Return rate limit info in headers
const legacyHeaders = false; // Disable X-RateLimit-* headers
// ---------------------------------------------------------------------------
// Limiters
// ---------------------------------------------------------------------------
/**
 * Strict limiter — AI-powered routes (tasks, extract)
 * 20 requests per minute per IP
 */
exports.aiRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders,
    legacyHeaders,
    message: {
        error: "Too many requests",
        message: "You have exceeded the rate limit for AI routes. Please wait before trying again.",
        retry_after_seconds: 60,
    },
});
/**
 * Moderate limiter — file uploads
 * 30 requests per minute per IP
 */
exports.uploadRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders,
    legacyHeaders,
    message: {
        error: "Too many requests",
        message: "You have exceeded the upload rate limit. Please wait before trying again.",
        retry_after_seconds: 60,
    },
});
/**
 * Lenient limiter — read routes
 * 100 requests per minute per IP
 */
exports.readRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders,
    legacyHeaders,
    message: {
        error: "Too many requests",
        message: "You have exceeded the read rate limit. Please wait before trying again.",
        retry_after_seconds: 60,
    },
});
/**
 * Auth limiter — login/register protection
 * 10 requests per minute per IP
 */
exports.authRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders,
    legacyHeaders,
    message: {
        error: "Too many requests",
        message: "Too many authentication attempts. Please wait before trying again.",
        retry_after_seconds: 60,
    },
});
