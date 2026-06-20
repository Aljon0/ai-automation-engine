/**
 * services/execution.service.ts
 *
 * Read operations against the workflow_executions table.
 *
 * Phase 5: list executions + get single execution detail.
 * Future phases: filter by user (Phase 9), aggregate stats (Phase 8).
 */

import { getSupabaseClient } from "../lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExecutionListItem {
  id: string;
  workflow_id: string;
  workflow_name: string;   // joined from workflow_registry
  intent_key: string;      // joined from workflow_registry
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

export interface ListExecutionsOptions {
  limit?: number;
  offset?: number;
  status?: "pending" | "success" | "failed";
}

export interface ListExecutionsResult {
  executions: ExecutionListItem[];
  total: number;
  limit: number;
  offset: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a paginated list of executions, newest first.
 * Joins workflow_registry to include workflow_name and intent_key.
 *
 * @param options.limit  - Max rows to return (default 50)
 * @param options.offset - Rows to skip for pagination (default 0)
 * @param options.status - Optional filter by status
 */
export async function listExecutions(
  options: ListExecutionsOptions = {},
  userId?: string
): Promise<ListExecutionsResult> {
  const { limit = 50, offset = 0, status } = options;
  const supabase = getSupabaseClient();

  let query = supabase
    .from("workflow_executions")
    .select(
      `
      id,
      workflow_id,
      input,
      status,
      file_name,
      file_type,
      created_at,
      completed_at,
      workflow_registry (
        workflow_name,
        intent_key
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list executions: ${error.message}`);
  }

  // Flatten the joined workflow_registry into the execution row
  const executions: ExecutionListItem[] = (data ?? []).map((row: Record<string, unknown>) => {
    const registry = row.workflow_registry as Record<string, string> | null;
    return {
      id: row.id as string,
      workflow_id: row.workflow_id as string,
      workflow_name: registry?.workflow_name ?? "Unknown Workflow",
      intent_key: registry?.intent_key ?? "unknown",
      input: row.input as string,
      status: row.status as "pending" | "success" | "failed",
      file_name: row.file_name as string | null,
      file_type: row.file_type as string | null,
      created_at: row.created_at as string,
      completed_at: row.completed_at as string | null,
    };
  });

  return {
    executions,
    total: count ?? 0,
    limit,
    offset,
  };
}

/**
 * Returns the full detail of a single execution by ID.
 * Includes result JSON and error message.
 *
 * Returns null if not found.
 */
export async function getExecutionById(
  id: string,
  userId?: string
): Promise<ExecutionDetail | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("workflow_executions")
    .select(
      `
      id,
      workflow_id,
      input,
      status,
      result,
      error,
      file_url,
      file_name,
      file_type,
      created_at,
      completed_at,
      workflow_registry (
        workflow_name,
        intent_key
      )
    `
    )
    .eq("id", id)
    .eq("user_id", userId ?? "")
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch execution: ${error.message}`);
  }

  const registry = Array.isArray(data.workflow_registry)
    ? ((data.workflow_registry[0] as Record<string, string> | undefined) ??
      null)
    : (data.workflow_registry as Record<string, string> | null);

  return {
    id: data.id,
    workflow_id: data.workflow_id,
    workflow_name: registry?.workflow_name ?? "Unknown Workflow",
    intent_key: registry?.intent_key ?? "unknown",
    input: data.input,
    status: data.status,
    result: data.result,
    error: data.error,
    file_url: data.file_url,
    file_name: data.file_name,
    file_type: data.file_type,
    created_at: data.created_at,
    completed_at: data.completed_at,
  };
}

/**
 * Returns execution counts grouped by status.
 * Used by the runs page header to show summary stats.
 */
export async function getExecutionStats(userId?: string): Promise<{
  total: number;
  success: number;
  failed: number;
  pending: number;
}> {
  const supabase = getSupabaseClient();

  let statsQuery = supabase
    .from("workflow_executions")
    .select("status");

  if (userId) {
    statsQuery = statsQuery.eq("user_id", userId);
  }

  const { data, error } = await statsQuery;

  if (error) {
    throw new Error(`Failed to fetch execution stats: ${error.message}`);
  }

  const rows = data ?? [];
  return {
    total: rows.length,
    success: rows.filter((r) => r.status === "success").length,
    failed: rows.filter((r) => r.status === "failed").length,
    pending: rows.filter((r) => r.status === "pending").length,
  };
}