"use strict";
/**
 * services/analytics.service.ts
 *
 * Aggregates workflow execution data into dashboard metrics.
 * All computation happens server-side — frontend receives
 * ready-to-display numbers and chart data.
 *
 * Phase 8: summary stats, per-workflow breakdown, recent activity.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalytics = getAnalytics;
const supabase_1 = require("../lib/supabase");
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Returns all analytics data needed for the dashboard.
 * Single function — one call from the route handler.
 */
async function getAnalytics(userId) {
    const [summary, byWorkflow, recent] = await Promise.all([
        getSummaryMetrics(userId),
        getWorkflowMetrics(userId),
        getRecentExecutions(userId),
    ]);
    return {
        summary,
        by_workflow: byWorkflow,
        recent,
        generated_at: new Date().toISOString(),
    };
}
// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------
async function getSummaryMetrics(userId) {
    const supabase = (0, supabase_1.getSupabaseClient)();
    // Fetch all executions for aggregation
    let execQuery = supabase
        .from("workflow_executions")
        .select("status, created_at, completed_at");
    if (userId)
        execQuery = execQuery.eq("user_id", userId);
    const { data: executions, error: execError } = await execQuery;
    if (execError) {
        throw new Error(`Failed to fetch executions: ${execError.message}`);
    }
    // Fetch active workflow count
    const { count: activeWorkflows, error: wfError } = await supabase
        .from("workflow_registry")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
    if (wfError) {
        throw new Error(`Failed to fetch workflow count: ${wfError.message}`);
    }
    const rows = executions ?? [];
    const total = rows.length;
    const successful = rows.filter((r) => r.status === "success").length;
    const failed = rows.filter((r) => r.status === "failed").length;
    const pending = rows.filter((r) => r.status === "pending").length;
    // Avg duration — only completed executions
    const completedRows = rows.filter((r) => r.completed_at && r.created_at && r.status !== "pending");
    const avgDuration = completedRows.length > 0
        ? completedRows.reduce((sum, r) => {
            const duration = new Date(r.completed_at).getTime() -
                new Date(r.created_at).getTime();
            return sum + duration;
        }, 0) / completedRows.length
        : 0;
    return {
        total_executions: total,
        successful_executions: successful,
        failed_executions: failed,
        pending_executions: pending,
        success_rate: total > 0 ? Math.round((successful / total) * 100) : 0,
        avg_duration_ms: Math.round(avgDuration),
        active_workflows: activeWorkflows ?? 0,
    };
}
async function getWorkflowMetrics(userId) {
    const supabase = (0, supabase_1.getSupabaseClient)();
    let wfQuery = supabase
        .from("workflow_executions")
        .select(`
      workflow_id,
      status,
      created_at,
      completed_at,
      workflow_registry (
        workflow_name,
        intent_key
      )
    `)
        .neq("status", "pending");
    if (userId)
        wfQuery = wfQuery.eq("user_id", userId);
    const { data, error } = await wfQuery;
    if (error) {
        throw new Error(`Failed to fetch workflow metrics: ${error.message}`);
    }
    // Group by workflow_id
    const grouped = new Map();
    for (const row of data ?? []) {
        const registry = row.workflow_registry;
        if (!registry)
            continue;
        if (!grouped.has(row.workflow_id)) {
            grouped.set(row.workflow_id, {
                workflow_name: registry.workflow_name,
                intent_key: registry.intent_key,
                rows: [],
            });
        }
        grouped.get(row.workflow_id).rows.push({
            status: row.status,
            created_at: row.created_at,
            completed_at: row.completed_at,
        });
    }
    // Compute per-workflow metrics
    const metrics = [];
    for (const [workflowId, { workflow_name, intent_key, rows }] of grouped) {
        const total = rows.length;
        const successful = rows.filter((r) => r.status === "success").length;
        const failed = rows.filter((r) => r.status === "failed").length;
        const completedRows = rows.filter((r) => r.completed_at);
        const avgDuration = completedRows.length > 0
            ? completedRows.reduce((sum, r) => {
                const duration = new Date(r.completed_at).getTime() -
                    new Date(r.created_at).getTime();
                return sum + duration;
            }, 0) / completedRows.length
            : 0;
        metrics.push({
            workflow_id: workflowId,
            workflow_name,
            intent_key,
            total_runs: total,
            successful_runs: successful,
            failed_runs: failed,
            success_rate: total > 0 ? Math.round((successful / total) * 100) : 0,
            avg_duration_ms: Math.round(avgDuration),
        });
    }
    // Sort by total runs descending
    return metrics.sort((a, b) => b.total_runs - a.total_runs);
}
async function getRecentExecutions(userId) {
    const supabase = (0, supabase_1.getSupabaseClient)();
    let recentQuery = supabase
        .from("workflow_executions")
        .select(`
      id,
      input,
      status,
      created_at,
      completed_at,
      workflow_registry (
        workflow_name,
        intent_key
      )
    `)
        .order("created_at", { ascending: false })
        .limit(10);
    if (userId)
        recentQuery = recentQuery.eq("user_id", userId);
    const { data, error } = await recentQuery;
    if (error) {
        throw new Error(`Failed to fetch recent executions: ${error.message}`);
    }
    return (data ?? []).map((row) => {
        const registry = row.workflow_registry;
        const durationMs = row.completed_at && row.created_at
            ? new Date(row.completed_at).getTime() -
                new Date(row.created_at).getTime()
            : null;
        return {
            id: row.id,
            workflow_name: registry?.workflow_name ?? "Unknown",
            intent_key: registry?.intent_key ?? "unknown",
            input: row.input,
            status: row.status,
            duration_ms: durationMs,
            created_at: row.created_at,
        };
    });
}
