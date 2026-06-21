"use strict";
/**
 * services/execution.service.ts
 *
 * Read operations against the workflow_executions table.
 *
 * Phase 5: list executions + get single execution detail.
 * Future phases: filter by user (Phase 9), aggregate stats (Phase 8).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listExecutions = listExecutions;
exports.getExecutionById = getExecutionById;
exports.getExecutionStats = getExecutionStats;
const supabase_1 = require("../lib/supabase");
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
async function listExecutions(options = {}, userId) {
    const { limit = 50, offset = 0, status } = options;
    const supabase = (0, supabase_1.getSupabaseClient)();
    let query = supabase
        .from("workflow_executions")
        .select(`
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
    `, { count: "exact" })
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
    const executions = (data ?? []).map((row) => {
        const registry = row.workflow_registry;
        return {
            id: row.id,
            workflow_id: row.workflow_id,
            workflow_name: registry?.workflow_name ?? "Unknown Workflow",
            intent_key: registry?.intent_key ?? "unknown",
            input: row.input,
            status: row.status,
            file_name: row.file_name,
            file_type: row.file_type,
            created_at: row.created_at,
            completed_at: row.completed_at,
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
async function getExecutionById(id, userId) {
    const supabase = (0, supabase_1.getSupabaseClient)();
    const { data, error } = await supabase
        .from("workflow_executions")
        .select(`
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
    `)
        .eq("id", id)
        .eq("user_id", userId ?? "")
        .single();
    if (error) {
        if (error.code === "PGRST116")
            return null;
        throw new Error(`Failed to fetch execution: ${error.message}`);
    }
    const registry = Array.isArray(data.workflow_registry)
        ? (data.workflow_registry[0] ??
            null)
        : data.workflow_registry;
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
async function getExecutionStats(userId) {
    const supabase = (0, supabase_1.getSupabaseClient)();
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
