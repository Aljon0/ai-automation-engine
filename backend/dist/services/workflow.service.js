"use strict";
/**
 * services/workflow.service.ts
 *
 * Handles all workflow-related database operations:
 * 1. Look up a workflow from the registry by intent key
 * 2. Create a pending execution record
 * 3. Trigger the n8n webhook
 * 4. Update the execution record with the result
 *
 * This service is the bridge between intent detection and n8n execution.
 * The route handler calls this — it never touches the DB or n8n directly.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.findWorkflowByIntent = findWorkflowByIntent;
exports.executeWorkflow = executeWorkflow;
const supabase_1 = require("../lib/supabase");
const n8n_1 = require("../lib/n8n");
// ---------------------------------------------------------------------------
// Registry lookup
// ---------------------------------------------------------------------------
/**
 * Finds an active workflow by intent key.
 * Returns null if no matching active workflow exists.
 */
async function findWorkflowByIntent(intent_key) {
    const supabase = (0, supabase_1.getSupabaseClient)();
    const { data, error } = await supabase
        .from("workflow_registry")
        .select("*")
        .eq("intent_key", intent_key)
        .eq("status", "active")
        .single();
    if (error) {
        // PGRST116 = no rows found — not a real error
        if (error.code === "PGRST116")
            return null;
        throw new Error(`Failed to query workflow registry: ${error.message}`);
    }
    return data;
}
// ---------------------------------------------------------------------------
// Execution tracking
// ---------------------------------------------------------------------------
/**
 * Creates a pending execution record before triggering n8n.
 * Gives us a record even if n8n fails.
 */
async function createExecution(workflow_id, input) {
    const supabase = (0, supabase_1.getSupabaseClient)();
    const { data, error } = await supabase
        .from("workflow_executions")
        .insert({ workflow_id, input, status: "pending" })
        .select()
        .single();
    if (error) {
        throw new Error(`Failed to create execution record: ${error.message}`);
    }
    return data;
}
/**
 * Updates an execution record after n8n responds.
 */
async function updateExecution(execution_id, update) {
    const supabase = (0, supabase_1.getSupabaseClient)();
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
        // Log but don't throw — the workflow already ran, don't fail the response
        console.error(`[workflow.service] Failed to update execution ${execution_id}: ${error.message}`);
    }
}
// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
/**
 * Executes a workflow end-to-end:
 * 1. Creates a pending execution record
 * 2. Triggers the n8n webhook
 * 3. Updates the execution record with success/failure
 * 4. Returns a structured result
 *
 * @param workflow - The workflow registry row to execute
 * @param input    - The raw user input string
 */
async function executeWorkflow(workflow, input) {
    // 1. Create pending record — exists even if n8n fails
    const execution = await createExecution(workflow.id, input);
    try {
        // 2. Trigger n8n webhook
        const n8nResult = await (0, n8n_1.triggerWebhook)(workflow.webhook_url, { input });
        // 3. Update execution as success
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
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // 4. Update execution as failed
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
