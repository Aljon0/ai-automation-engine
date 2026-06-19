"use strict";
/**
 * services/workflow.service.ts
 *
 * Phase 4 update: executeWorkflow now accepts optional file metadata.
 * File fields are passed to n8n webhook and saved to execution record.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.findWorkflowByIntent = findWorkflowByIntent;
exports.executeWorkflow = executeWorkflow;
const supabase_1 = require("../lib/supabase");
const n8n_1 = require("../lib/n8n");
// ---------------------------------------------------------------------------
// Registry lookup
// ---------------------------------------------------------------------------
async function findWorkflowByIntent(intent_key) {
    const supabase = (0, supabase_1.getSupabaseClient)();
    const { data, error } = await supabase
        .from("workflow_registry")
        .select("*")
        .eq("intent_key", intent_key)
        .eq("status", "active")
        .single();
    if (error) {
        if (error.code === "PGRST116")
            return null;
        throw new Error(`Failed to query workflow registry: ${error.message}`);
    }
    return data;
}
// ---------------------------------------------------------------------------
// Execution tracking
// ---------------------------------------------------------------------------
async function createExecution(workflow_id, input, file) {
    const supabase = (0, supabase_1.getSupabaseClient)();
    const { data, error } = await supabase
        .from("workflow_executions")
        .insert({
        workflow_id,
        input,
        status: "pending",
        file_url: file?.file_url ?? null,
        file_name: file?.file_name ?? null,
        file_type: file?.file_type ?? null,
    })
        .select()
        .single();
    if (error) {
        throw new Error(`Failed to create execution record: ${error.message}`);
    }
    return data;
}
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
        console.error(`[workflow.service] Failed to update execution ${execution_id}: ${error.message}`);
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
async function executeWorkflow(workflow, input, file) {
    // 1. Create pending record
    const execution = await createExecution(workflow.id, input, file);
    try {
        // 2. Build n8n payload — include file fields if present
        const webhookPayload = { input };
        if (file) {
            webhookPayload.file_url = file.file_url;
            webhookPayload.file_name = file.file_name;
            webhookPayload.file_type = file.file_type;
        }
        // 3. Trigger n8n webhook
        const n8nResult = await (0, n8n_1.triggerWebhook)(workflow.webhook_url, webhookPayload);
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
    }
    catch (err) {
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
