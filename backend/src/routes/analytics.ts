/**
 * routes/analytics.ts
 *
 * GET /api/analytics
 *
 * Returns all dashboard metrics in a single response.
 * Calls analytics.service.ts which aggregates all data server-side.
 */

import { Router, Request, Response } from "express";
import { getAnalytics } from "../services/analytics.service";

export const analyticsRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/analytics
// ---------------------------------------------------------------------------

analyticsRouter.get("/", async (_req: Request, res: Response) => {
  const data = await getAnalytics();
  res.status(200).json(data);
});