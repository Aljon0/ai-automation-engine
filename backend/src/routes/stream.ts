/**
 * routes/stream.ts
 *
 * GET /api/stream/:executionId
 *
 * Server-Sent Events endpoint for live workflow execution updates.
 * The frontend connects here immediately after POST /api/tasks returns
 * an execution_id, then receives real-time progress events.
 *
 * Flow:
 * 1. Validate execution ID
 * 2. Set SSE headers
 * 3. Send heartbeat immediately so client knows connection is alive
 * 4. Subscribe to execution events
 * 5. Forward events to client as they arrive
 * 6. Clean up subscription on client disconnect
 * 7. Auto-close after 60s timeout
 */

import { Router, Request, Response } from "express";
import {
  subscribeToExecution,
  sendSSEEvent,
  setSSEHeaders,
  ExecutionEvent,
} from "../lib/sse";

export const streamRouter = Router();

// Max time to hold SSE connection open (60 seconds)
const SSE_TIMEOUT_MS = 60 * 1000;

// ---------------------------------------------------------------------------
// GET /api/stream/:executionId
// ---------------------------------------------------------------------------

streamRouter.get("/:executionId", (req: Request, res: Response) => {
    const { executionId } = req.params;
  
    // Guard against array params and narrow the type to `string`
    if (typeof executionId !== "string") {
      res.status(400).json({
        error: "Invalid execution ID",
        message: "Execution ID must be a single string value",
      });
      return;
    }
  
    // Basic UUID format check
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
    if (!uuidRegex.test(executionId)) {
      res.status(400).json({
        error: "Invalid execution ID",
        message: "Execution ID must be a valid UUID",
      });
      return;
    }

  console.log(
    `[stream] Client connected for execution ${executionId.slice(0, 8)}`
  );

  // 1. Set SSE headers — must happen before any writes
  setSSEHeaders(res);

  // 2. Send immediate heartbeat so client knows connection is alive
  const heartbeat: ExecutionEvent = {
    type: "intent_detected",
    timestamp: new Date().toISOString(),
    data: { message: "Stream connected — waiting for events" },
  };
  // Send as a comment to not trigger event handlers
  res.write(`: connected\n\n`);

  // 3. Track whether execution has completed
  let completed = false;

  // 4. Subscribe to events for this execution
  const unsubscribe = subscribeToExecution(executionId, (event) => {
    sendSSEEvent(res, event);

    // Close connection when execution finishes
    if (event.type === "completed" || event.type === "failed") {
      completed = true;
      setTimeout(() => {
        if (!res.writableEnded) {
          res.end();
        }
      }, 500); // Small delay so client receives the final event
    }
  });

  // 5. Auto-close after timeout
  const timeout = setTimeout(() => {
    if (!completed && !res.writableEnded) {
      console.log(
        `[stream] Timeout for execution ${executionId.slice(0, 8)}`
      );
      const timeoutEvent: ExecutionEvent = {
        type: "error",
        timestamp: new Date().toISOString(),
        data: { message: "Stream timed out after 60 seconds" },
      };
      sendSSEEvent(res, timeoutEvent);
      res.end();
    }
  }, SSE_TIMEOUT_MS);

  // 6. Clean up on client disconnect
  req.on("close", () => {
    console.log(
      `[stream] Client disconnected for execution ${executionId.slice(0, 8)}`
    );
    unsubscribe();
    clearTimeout(timeout);
  });
});