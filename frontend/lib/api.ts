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

/**
 * POST /api/tasks
 * Submits a natural language task for intent detection and workflow execution.
 */
export async function submitTask(input: string): Promise<TaskResponse> {
  return apiRequest<TaskResponse>("/api/tasks", {
    method: "POST",
    body: JSON.stringify({ input } satisfies TaskRequest),
  });
}