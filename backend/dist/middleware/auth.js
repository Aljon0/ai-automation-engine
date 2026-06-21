"use strict";
/**
 * middleware/auth.ts
 *
 * JWT verification middleware for protected routes.
 *
 * Verifies the Bearer token from the Authorization header
 * using Supabase's built-in JWT verification.
 *
 * On success: attaches { id, email } to req.user
 * On failure: returns 401 Unauthorized
 *
 * Usage:
 *   router.post("/", requireAuth, async (req, res) => {
 *     const userId = req.user!.id;
 *   });
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
const supabase_1 = require("../lib/supabase");
// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
/**
 * Requires a valid Supabase JWT in the Authorization header.
 * Attaches decoded user to req.user on success.
 * Returns 401 if token is missing, invalid, or expired.
 */
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
            error: "Unauthorized",
            message: "Missing or invalid Authorization header. Expected: Bearer <token>",
        });
        return;
    }
    const token = authHeader.slice(7); // Remove "Bearer "
    try {
        const supabase = (0, supabase_1.getSupabaseClient)();
        // Verify token with Supabase — handles expiry, signature, etc.
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) {
            res.status(401).json({
                error: "Unauthorized",
                message: "Invalid or expired token. Please log in again.",
            });
            return;
        }
        // Attach user to request for downstream handlers
        req.user = {
            id: data.user.id,
            email: data.user.email ?? "",
        };
        next();
    }
    catch (err) {
        console.error(`[auth] Token verification failed: ${err instanceof Error ? err.message : String(err)}`);
        res.status(401).json({
            error: "Unauthorized",
            message: "Token verification failed.",
        });
    }
}
/**
 * Optional auth middleware — attaches user if token present
 * but does NOT block the request if no token.
 * Useful for routes that work both authenticated and anonymous.
 */
async function optionalAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        next();
        return;
    }
    const token = authHeader.slice(7);
    try {
        const supabase = (0, supabase_1.getSupabaseClient)();
        const { data } = await supabase.auth.getUser(token);
        if (data.user) {
            req.user = {
                id: data.user.id,
                email: data.user.email ?? "",
            };
        }
    }
    catch {
        // Silently ignore auth errors for optional auth
    }
    next();
}
