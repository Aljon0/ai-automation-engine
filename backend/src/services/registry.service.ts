/**
 * services/registry.service.ts
 *
 * Read operations against the workflow_registry table.
 *
 * Separate from workflow.service.ts (which handles execution) —
 * this service is purely about what workflows exist and their metadata.
 *
 * Phase 2: list active workflows.
 * Future phases: filter by capability, check required_inputs, etc.
 */

import { getSupabaseClient } from "../lib/supabase";
import type { WorkflowRegistryRow } from "./workflow.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowSummary {
  id: string;
  workflow_name: string;
  description: string;
  intent_key: string;
  status: "active" | "inactive";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns all active workflows from the registry.
 * Used by GET /api/workflows to tell the frontend what's available.
 *
 * Only returns fields safe to expose publicly — no webhook_url.
 */
export async function listActiveWorkflows(): Promise<WorkflowSummary[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("workflow_registry")
    .select("id, workflow_name, description, intent_key, status")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to list workflows: ${error.message}`);
  }

  return (data ?? []) as WorkflowSummary[];
}

/**
 * Returns a single workflow by its intent key.
 * Used to verify a workflow exists before attempting execution.
 *
 * Returns null if not found or inactive.
 */
export async function getWorkflowByIntentKey(
  intent_key: string
): Promise<WorkflowRegistryRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("workflow_registry")
    .select("*")
    .eq("intent_key", intent_key)
    .eq("status", "active")
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch workflow: ${error.message}`);
  }

  return data as WorkflowRegistryRow;
}

/**
 * Returns the total count of active workflows.
 * Lightweight check used by health monitoring (Phase 8).
 */
export async function countActiveWorkflows(): Promise<number> {
  const supabase = getSupabaseClient();

  const { count, error } = await supabase
    .from("workflow_registry")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  if (error) {
    throw new Error(`Failed to count workflows: ${error.message}`);
  }

  return count ?? 0;
}