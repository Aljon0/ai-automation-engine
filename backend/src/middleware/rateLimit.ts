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

import rateLimit from "express-rate-limit";

// ---------------------------------------------------------------------------
// Shared config
// ---------------------------------------------------------------------------

const standardHeaders = true; // Return rate limit info in headers
const legacyHeaders = false;  // Disable X-RateLimit-* headers

// ---------------------------------------------------------------------------
// Limiters
// ---------------------------------------------------------------------------

/**
 * Strict limiter — AI-powered routes (tasks, extract)
 * 20 requests per minute per IP
 */
export const aiRateLimit = rateLimit({
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
export const uploadRateLimit = rateLimit({
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
export const readRateLimit = rateLimit({
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
export const authRateLimit = rateLimit({
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