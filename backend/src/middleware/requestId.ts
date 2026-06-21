/**
 * middleware/requestId.ts
 *
 * Assigns a unique ID to every request.
 * Used for error tracking — logs and error responses include
 * the request ID so you can trace issues across log lines.
 */

import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Assigns a unique UUID to every incoming request.
 * Attaches to req.requestId and sets X-Request-ID response header.
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
}