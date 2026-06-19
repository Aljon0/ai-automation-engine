/**
 * routes/tasks.ts
 *
 * POST /api/tasks
 *
 * Phase 7 update: emits SSE events at each execution step
 * so the frontend can show live progress updates.
 *
 * Event sequence:
 * 1. intent_detected   — after Groq/keyword classification
 * 2. workflow_selected — after DB registry lookup
 * 3. n8n_triggered     — after n8n webhook fires
 * 4. completed/failed  — after execution record updated
 */

import { Router, Request, Response } from "express";
import { detectIntent, isIntentDetected } from "../services/intent.service";
import {
  findWorkflowByIntent,
  executeWorkflow,
} from "../services/workflow.service";
import { emitExecutionEvent } from "../lib/sse";

export const tasksRouter = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskRequestBody {
  input?: unknown;
  file_url?: unknown;
  file_name?: unknown;
  file_type?: unknown;
}

// ---------------------------------------------------------------------------
// POST /api/tasks
// ---------------------------------------------------------------------------

tasksRouter.post("/", async (req: Request, res: Response) => {
  const { input, file_url, file_name, file_type } =
    req.body as TaskRequestBody;

  // 1. Validate input
  if (!input || typeof input !== "string" || input.trim().length === 0) {
    res.status(400).json({
      error: "Validation failed",
      message: "Request body must include a non-empty string field: input",
    });
    return;
  }

  // Validate optional file fields
  const hasFile = file_url || file_name || file_type;
  if (hasFile) {
    if (
      typeof file_url !== "string" ||
      typeof file_name !== "string" ||
      typeof file_type !== "string"
    ) {
      res.status(400).json({
        error: "Validation failed",
        message:
          "If providing a file, include all three fields: file_url, file_name, file_type",
      });
      return;
    }
  }

  const trimmedInput = input.trim();

  // 2. Detect intent
  const intentResult = await detectIntent(trimmedInput);

  if (!isIntentDetected(intentResult)) {
    res.status(422).json({
      error: "Intent not recognized",
      message: intentResult.reason,
    });
    return;
  }

  console.log(
    `[tasks] Intent detected: "${intentResult.intent_key}" via ${intentResult.method}`
  );

  // 3. Find matching workflow
  const workflow = await findWorkflowByIntent(intentResult.intent_key);

  if (!workflow) {
    res.status(404).json({
      error: "No workflow found",
      message: `No active workflow registered for intent: ${intentResult.intent_key}`,
    });
    return;
  }

  console.log(`[tasks] Workflow selected: "${workflow.workflow_name}"`);

  // 4. Build file metadata
  const fileMetadata =
    hasFile &&
    typeof file_url === "string" &&
    typeof file_name === "string" &&
    typeof file_type === "string"
      ? { file_url, file_name, file_type }
      : undefined;

  // 5. Execute workflow — returns execution_id immediately
  const executionResult = await executeWorkflow(
    workflow,
    trimmedInput,
    fileMetadata
  );

  // 6. Emit SSE events now that we have execution_id
  const executionId = executionResult.execution_id;

  // Emit intent detected
  emitExecutionEvent(executionId, "intent_detected", {
    intent_key: intentResult.intent_key,
    method: intentResult.method,
    matched_term: intentResult.matched_term,
  });

  // Emit workflow selected
  emitExecutionEvent(executionId, "workflow_selected", {
    workflow_name: workflow.workflow_name,
    intent_key: workflow.intent_key,
  });

  // Emit n8n triggered
  emitExecutionEvent(executionId, "n8n_triggered", {
    workflow_name: workflow.workflow_name,
  });

  // Emit completed or failed
  if (executionResult.status === "success") {
    emitExecutionEvent(executionId, "completed", {
      status: "success",
      result: executionResult.result,
    });
  } else {
    emitExecutionEvent(executionId, "failed", {
      status: "failed",
      error: executionResult.error,
    });
  }

  console.log(
    `[tasks] Execution ${executionId} — ${executionResult.status}`
  );

  // 7. Return result
  res.status(200).json({
    execution_id: executionResult.execution_id,
    workflow_name: executionResult.workflow_name,
    intent_key: executionResult.intent_key,
    status: executionResult.status,
    result: executionResult.result,
    error: executionResult.error,
    file_name: fileMetadata?.file_name ?? null,
  });
});