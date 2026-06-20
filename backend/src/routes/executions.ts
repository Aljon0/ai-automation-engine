/**
 * routes/executions.ts
 *
 * Phase 9 update: all routes require auth and filter by user_id.
 */

import { Router, Request, Response } from "express";
import {
  listExecutions,
  getExecutionById,
  getExecutionStats,
} from "../services/execution.service";
import { requireAuth } from "../middleware/auth";

export const executionsRouter = Router();

// Apply auth to all execution routes
executionsRouter.use(requireAuth);

executionsRouter.get("/stats", async (req: Request, res: Response) => {
  const stats = await getExecutionStats(req.user!.id);
  res.status(200).json(stats);
});

executionsRouter.get("/", async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10), 100);
  const offset = Math.max(parseInt(String(req.query.offset ?? "0"), 10), 0);
  const status = req.query.status as "pending" | "success" | "failed" | undefined;

  if (status && !["pending", "success", "failed"].includes(status)) {
    res.status(400).json({
      error: "Invalid status filter",
      message: "status must be one of: pending, success, failed",
    });
    return;
  }

  const result = await listExecutions({ limit, offset, status }, req.user!.id);
  res.status(200).json(result);
});

executionsRouter.get("/:id", async (req: Request, res: Response) => {
  const id = String(req.params.id);

// Basic UUID format check
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(id)) {
  res.status(400).json({
    error: "Invalid ID",
    message: "Execution ID must be a valid UUID",
  });
  return;
}

const execution = await getExecutionById(id);

if (!execution) {
  res.status(404).json({
    error: "Not found",
    message: `No execution found with ID: ${id}`,
  });
  return;
}

res.status(200).json(execution);
});