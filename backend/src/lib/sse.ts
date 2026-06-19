/**
 * lib/sse.ts
 *
 * Server-Sent Events event store and emitter.
 *
 * Architecture:
 * - tasks.ts  PUBLISHES events via emitExecutionEvent()
 * - stream.ts SUBSCRIBES to events via subscribeToExecution()
 *
 * Events are stored in memory per execution ID.
 * Subscribers are notified immediately when new events arrive.
 * Cleanup happens automatically when clients disconnect.
 */

import { Response } from "express";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExecutionEventType =
  | "intent_detected"
  | "workflow_selected"
  | "n8n_triggered"
  | "completed"
  | "failed"
  | "error";

export interface ExecutionEvent {
  type: ExecutionEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

type Subscriber = (event: ExecutionEvent) => void;

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

// Events per execution — kept for late-joining clients
const eventStore = new Map<string, ExecutionEvent[]>();

// Active subscribers per execution
const subscribers = new Map<string, Set<Subscriber>>();

// Max events to store per execution (prevents memory leak)
const MAX_EVENTS = 20;

// Auto-cleanup execution data after 5 minutes
const CLEANUP_AFTER_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Emits an event for a specific execution.
 * All active subscribers are notified immediately.
 * Event is also stored for late-joining clients.
 *
 * @param executionId - The workflow execution UUID
 * @param type        - Event type
 * @param data        - Event payload
 */
export function emitExecutionEvent(
  executionId: string,
  type: ExecutionEventType,
  data: Record<string, unknown>
): void {
  const event: ExecutionEvent = {
    type,
    timestamp: new Date().toISOString(),
    data,
  };

  // Store event for late-joining clients
  if (!eventStore.has(executionId)) {
    eventStore.set(executionId, []);

    // Schedule cleanup
    setTimeout(() => {
      eventStore.delete(executionId);
      subscribers.delete(executionId);
    }, CLEANUP_AFTER_MS);
  }

  const events = eventStore.get(executionId)!;
  events.push(event);

  // Trim to max events
  if (events.length > MAX_EVENTS) {
    events.shift();
  }

  // Notify all active subscribers
  const subs = subscribers.get(executionId);
  if (subs) {
    subs.forEach((sub) => sub(event));
  }

  console.log(
    `[sse] Emitted "${type}" for execution ${executionId.slice(0, 8)}`
  );
}

/**
 * Subscribes to events for a specific execution.
 * Immediately replays any stored events to the new subscriber.
 * Returns an unsubscribe function to call on client disconnect.
 *
 * @param executionId - The workflow execution UUID
 * @param subscriber  - Callback called with each new event
 * @returns unsubscribe function
 */
export function subscribeToExecution(
  executionId: string,
  subscriber: Subscriber
): () => void {
  // Replay stored events immediately
  const stored = eventStore.get(executionId) ?? [];
  stored.forEach((event) => subscriber(event));

  // Register subscriber for future events
  if (!subscribers.has(executionId)) {
    subscribers.set(executionId, new Set());
  }
  subscribers.get(executionId)!.add(subscriber);

  // Return unsubscribe function
  return () => {
    const subs = subscribers.get(executionId);
    if (subs) {
      subs.delete(subscriber);
      if (subs.size === 0) {
        subscribers.delete(executionId);
      }
    }
  };
}

/**
 * Sends an SSE-formatted message to an Express Response object.
 * Handles the SSE wire format: "data: ...\n\n"
 *
 * @param res   - Express response with SSE headers already set
 * @param event - Event to send
 */
export function sendSSEEvent(res: Response, event: ExecutionEvent): void {
  const payload = JSON.stringify(event);
  res.write(`data: ${payload}\n\n`);

  // Flush to client immediately (important for streaming)
  if (typeof (res as unknown as { flush?: () => void }).flush === "function") {
    (res as unknown as { flush: () => void }).flush();
  }
}

/**
 * Sets SSE headers on an Express Response.
 * Must be called before any writes.
 */
export function setSSEHeaders(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
  res.flushHeaders();
}