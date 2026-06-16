/**
 * routes/workflows.ts
 *
 * GET /api/workflows
 *
 * Returns the list of active workflows from the registry.
 * Used by the frontend to display available automations as context.
 *
 * No request body needed — this is a pure read endpoint.
 */

import { Router, Request, Response } from "express";
import {
  listActiveWorkflows,
  WorkflowSummary,
} from "../services/registry.service";

export const workflowsRouter = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkflowsResponse {
  workflows: WorkflowSummary[];
  count: number;
}

// ---------------------------------------------------------------------------
// GET /api/workflows
// ---------------------------------------------------------------------------

workflowsRouter.get("/", async (_req: Request, res: Response) => {
  const workflows = await listActiveWorkflows();

  const body: WorkflowsResponse = {
    workflows,
    count: workflows.length,
  };

  res.status(200).json(body);
});