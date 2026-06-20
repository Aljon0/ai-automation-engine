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

import { Request, Response, NextFunction } from "express";
import { getSupabaseClient } from "../lib/supabase";

// ---------------------------------------------------------------------------
// Type augmentation — add user to Express Request
// ---------------------------------------------------------------------------

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Requires a valid Supabase JWT in the Authorization header.
 * Attaches decoded user to req.user on success.
 * Returns 401 if token is missing, invalid, or expired.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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
    const supabase = getSupabaseClient();

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
  } catch (err) {
    console.error(
      `[auth] Token verification failed: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
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
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.slice(7);

  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getUser(token);

    if (data.user) {
      req.user = {
        id: data.user.id,
        email: data.user.email ?? "",
      };
    }
  } catch {
    // Silently ignore auth errors for optional auth
  }

  next();
}