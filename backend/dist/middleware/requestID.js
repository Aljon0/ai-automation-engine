"use strict";
/**
 * middleware/requestId.ts
 *
 * Assigns a unique ID to every request.
 * Used for error tracking — logs and error responses include
 * the request ID so you can trace issues across log lines.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = requestIdMiddleware;
const crypto_1 = require("crypto");
/**
 * Assigns a unique UUID to every incoming request.
 * Attaches to req.requestId and sets X-Request-ID response header.
 */
function requestIdMiddleware(req, res, next) {
    const requestId = (0, crypto_1.randomUUID)();
    req.requestId = requestId;
    res.setHeader("X-Request-ID", requestId);
    next();
}
