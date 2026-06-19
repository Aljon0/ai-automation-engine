/**
 * lib/api.ts
 *
 * Typed HTTP client for the Express backend.
 *
 * All backend communication goes through here — no raw fetch calls
 * in components or pages. Keeps base URL, error handling, and response
 * types in one place.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// ---------------------------------------------------------------------------
// Shared types — mirror backend/src/routes/health.ts shapes
// ---------------------------------------------------------------------------

type ServiceStatus =
  | { status: "up" }
  | { status: "down"; error: string };

export interface HealthResponse {
  status: "healthy" | "degraded";
  timestamp: string;
  services: {
    supabase: ServiceStatus;
    n8n: ServiceStatus;
  };
}

// ---------------------------------------------------------------------------
// Shared types — mirror backend/src/routes/tasks.ts shapes
// ---------------------------------------------------------------------------

export interface TaskRequest {
  input: string;
}

export interface TaskResponse {
  execution_id: string;
  workflow_name: string;
  intent_key: string;
  status: "success" | "failed";
  result: Record<string, unknown> | null;
  error: string | null;
  file_name: string | null;
}

// ---------------------------------------------------------------------------
// Internal request helper
// ---------------------------------------------------------------------------

async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * GET /health
 * Fetches the infrastructure health status from the backend.
 */
export async function fetchHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/health");
}



// ---------------------------------------------------------------------------
// Shared types — mirror backend/src/routes/workflows.ts shapes
// ---------------------------------------------------------------------------

export interface WorkflowSummary {
  id: string;
  workflow_name: string;
  description: string;
  intent_key: string;
  status: "active" | "inactive";
}

export interface WorkflowsResponse {
  workflows: WorkflowSummary[];
  count: number;
}

/**
 * GET /api/workflows
 * Fetches all active workflows from the registry.
 * Used to display available automations as context on the task form.
 */
export async function fetchWorkflows(): Promise<WorkflowsResponse> {
  return apiRequest<WorkflowsResponse>("/api/workflows");
}

// ---------------------------------------------------------------------------
// Shared types — mirror backend/src/routes/upload.ts shapes
// ---------------------------------------------------------------------------

export interface UploadResponse {
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

// ---------------------------------------------------------------------------
// Phase 4 — File upload + updated task submission
// ---------------------------------------------------------------------------

/**
 * POST /api/upload
 * Uploads a file to Supabase Storage via the backend.
 * Returns file metadata including the public URL.
 *
 * Uses FormData — NOT JSON — so we bypass apiRequest's
 * Content-Type: application/json header.
 */
export async function uploadFile(file: File): Promise<UploadResponse> {
  const url = `${BASE_URL}/api/upload`;

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(url, {
    method: "POST",
    body: formData,
    // No Content-Type header — browser sets it automatically
    // with the correct multipart boundary for FormData
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Upload error ${res.status}: ${text}`);
  }

  return res.json() as Promise<UploadResponse>;
}

/**
 * POST /api/tasks (Phase 4 update)
 * Submits a task with optional file attachment.
 * Call uploadFile() first to get the file metadata, then pass it here.
 */
export async function submitTask(
  input: string,
  file?: UploadResponse
): Promise<TaskResponse> {
  return apiRequest<TaskResponse>("/api/tasks", {
    method: "POST",
    body: JSON.stringify({
      input,
      ...(file && {
        file_url: file.file_url,
        file_name: file.file_name,
        file_type: file.file_type,
      }),
    }),
  });
}

// ---------------------------------------------------------------------------
// Shared types — mirror backend/src/services/execution.service.ts shapes
// ---------------------------------------------------------------------------

export interface ExecutionListItem {
  id: string;
  workflow_id: string;
  workflow_name: string;
  intent_key: string;
  input: string;
  status: "pending" | "success" | "failed";
  file_name: string | null;
  file_type: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ExecutionDetail extends ExecutionListItem {
  file_url: string | null;
  result: Record<string, unknown> | null;
  error: string | null;
}

export interface ListExecutionsResult {
  executions: ExecutionListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface ExecutionStats {
  total: number;
  success: number;
  failed: number;
  pending: number;
}

export interface ListExecutionsOptions {
  limit?: number;
  offset?: number;
  status?: "pending" | "success" | "failed";
}

// ---------------------------------------------------------------------------
// Phase 5 — Execution history
// ---------------------------------------------------------------------------

/**
 * GET /api/executions
 * Fetches paginated list of workflow executions, newest first.
 */
export async function fetchExecutions(
  options: ListExecutionsOptions = {}
): Promise<ListExecutionsResult> {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset) params.set("offset", String(options.offset));
  if (options.status) params.set("status", options.status);

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<ListExecutionsResult>(`/api/executions${query}`);
}

/**
 * GET /api/executions/stats
 * Fetches summary counts by status.
 */
export async function fetchExecutionStats(): Promise<ExecutionStats> {
  return apiRequest<ExecutionStats>("/api/executions/stats");
}

/**
 * GET /api/executions/:id
 * Fetches full detail of a single execution.
 */
export async function fetchExecutionById(
  id: string
): Promise<ExecutionDetail> {
  return apiRequest<ExecutionDetail>(`/api/executions/${id}`);
}

// ---------------------------------------------------------------------------
// Phase 7 — SSE streaming types and client
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

export interface StreamCallbacks {
  onIntent?: (data: ExecutionEvent["data"]) => void;
  onWorkflowSelected?: (data: ExecutionEvent["data"]) => void;
  onN8nTriggered?: (data: ExecutionEvent["data"]) => void;
  onCompleted?: (data: ExecutionEvent["data"]) => void;
  onFailed?: (data: ExecutionEvent["data"]) => void;
  onError?: (data: ExecutionEvent["data"]) => void;
}

/**
 * GET /api/stream/:executionId
 *
 * Opens an SSE connection for a specific execution and calls
 * the appropriate callback as each event arrives.
 *
 * Returns a cleanup function — call it to close the stream early
 * (e.g. on component unmount).
 *
 * @param executionId - UUID from POST /api/tasks response
 * @param callbacks   - Handler for each event type
 * @returns close function
 */
export function streamExecution(
  executionId: string,
  callbacks: StreamCallbacks
): () => void {
  const url = `${BASE_URL}/api/stream/${executionId}`;
  const source = new EventSource(url);

  source.onmessage = (event) => {
    try {
      const parsed: ExecutionEvent = JSON.parse(event.data);

      switch (parsed.type) {
        case "intent_detected":
          callbacks.onIntent?.(parsed.data);
          break;
        case "workflow_selected":
          callbacks.onWorkflowSelected?.(parsed.data);
          break;
        case "n8n_triggered":
          callbacks.onN8nTriggered?.(parsed.data);
          break;
        case "completed":
          callbacks.onCompleted?.(parsed.data);
          source.close(); // close after final event
          break;
        case "failed":
          callbacks.onFailed?.(parsed.data);
          source.close();
          break;
        case "error":
          callbacks.onError?.(parsed.data);
          source.close();
          break;
      }
    } catch {
      // Ignore malformed events
    }
  };

  source.onerror = () => {
    callbacks.onError?.({ message: "Stream connection lost" });
    source.close();
  };

  // Return cleanup function for React useEffect
  return () => source.close();
}