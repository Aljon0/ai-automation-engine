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
  file_name?: string;
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