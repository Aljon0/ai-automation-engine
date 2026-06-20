/**
 * services/workflow.service.ts
 *
 * Phase 4 update: executeWorkflow now accepts optional file metadata.
 * File fields are passed to n8n webhook and saved to execution record.
 */

import { getSupabaseClient } from "../lib/supabase";
import { triggerWebhook } from "../lib/n8n";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowRegistryRow {
  id: string;
  workflow_name: string;
  description: string;
  webhook_url: string;
  intent_key: string;
  status: "active" | "inactive";
  created_at: string;
}

export interface WorkflowExecutionRow {
  id: string;
  workflow_id: string;
  input: string;
  status: "pending" | "success" | "failed";
  result: Record<string, unknown> | null;
  error: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface FileMetadata {
  file_url: string;
  file_name: string;
  file_type: string;
}

export interface ExecuteWorkflowResult {
  execution_id: string;
  workflow_name: string;
  intent_key: string;
  status: "success" | "failed";
  result: Record<string, unknown> | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Registry lookup
// ---------------------------------------------------------------------------

export async function findWorkflowByIntent(
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
    throw new Error(`Failed to query workflow registry: ${error.message}`);
  }

  return data as WorkflowRegistryRow;
}

// ---------------------------------------------------------------------------
// Execution tracking
// ---------------------------------------------------------------------------

async function createExecution(
  workflow_id: string,
  input: string,
  file?: FileMetadata,
  userId?: string
): Promise<WorkflowExecutionRow> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("workflow_executions")
    .insert({
      workflow_id,
      input,
      status: "pending",
      file_url: file?.file_url ?? null,
      file_name: file?.file_name ?? null,
      file_type: file?.file_type ?? null,
      user_id: userId ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create execution record: ${error.message}`);
  }

  return data as WorkflowExecutionRow;
}

async function updateExecution(
  execution_id: string,
  update: {
    status: "success" | "failed";
    result?: Record<string, unknown>;
    error?: string;
  }
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("workflow_executions")
    .update({
      status: update.status,
      result: update.result ?? null,
      error: update.error ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", execution_id);

  if (error) {
    console.error(
      `[workflow.service] Failed to update execution ${execution_id}: ${error.message}`
    );
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Executes a workflow end-to-end.
 * Phase 4: accepts optional file metadata passed to n8n webhook payload.
 *
 * @param workflow - The workflow registry row to execute
 * @param input    - The raw user input string
 * @param file     - Optional file metadata from a prior upload
 */
export async function executeWorkflow(
  workflow: WorkflowRegistryRow,
  input: string,
  file?: FileMetadata,
  userId?: string
): Promise<ExecuteWorkflowResult> {
  // 1. Create pending record
  const execution = await createExecution(workflow.id, input, file, userId);

  try {
    // 2. Build n8n payload — include file fields if present
    const webhookPayload: Record<string, unknown> = { input };

    if (file) {
      webhookPayload.file_url = file.file_url;
      webhookPayload.file_name = file.file_name;
      webhookPayload.file_type = file.file_type;
    }

    // 3. Trigger n8n webhook
    const n8nResult = await triggerWebhook(workflow.webhook_url, webhookPayload);

    // 4. Update execution as success
    await updateExecution(execution.id, {
      status: "success",
      result: n8nResult,
    });

    return {
      execution_id: execution.id,
      workflow_name: workflow.workflow_name,
      intent_key: workflow.intent_key,
      status: "success",
      result: n8nResult,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    await updateExecution(execution.id, {
      status: "failed",
      error: message,
    });

    return {
      execution_id: execution.id,
      workflow_name: workflow.workflow_name,
      intent_key: workflow.intent_key,
      status: "failed",
      result: null,
      error: message,
    };
  }
}