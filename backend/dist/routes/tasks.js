"use strict";
/**
 * routes/tasks.ts
 *
 * POST /api/tasks
 *
 * The core Phase 1 endpoint. Accepts a natural language task input,
 * detects intent, finds the matching workflow, triggers n8n, and
 * returns the execution result.
 *
 * Flow:
 * 1. Validate request body
 * 2. Detect intent from input
 * 3. Find matching workflow in registry
 * 4. Execute workflow (trigger n8n + track in DB)
 * 5. Return structured result
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tasksRouter = void 0;
const express_1 = require("express");
const intent_service_1 = require("../services/intent.service");
const workflow_service_1 = require("../services/workflow.service");
exports.tasksRouter = (0, express_1.Router)();
// ---------------------------------------------------------------------------
// POST /api/tasks
// ---------------------------------------------------------------------------
exports.tasksRouter.post("/", async (req, res) => {
    const { input } = req.body;
    // 1. Validate
    if (!input || typeof input !== "string" || input.trim().length === 0) {
        res.status(400).json({
            error: "Validation failed",
            message: "Request body must include a non-empty string field: input",
        });
        return;
    }
    const trimmedInput = input.trim();
    // 2. Detect intent
    const intentResult = (0, intent_service_1.detectIntent)(trimmedInput);
    if (!(0, intent_service_1.isIntentDetected)(intentResult)) {
        res.status(422).json({
            error: "Intent not recognized",
            message: intentResult.reason,
        });
        return;
    }
    console.log(`[tasks] Intent detected: "${intentResult.intent_key}" ` +
        `(matched: "${intentResult.matched_term}")`);
    // 3. Find matching workflow
    const workflow = await (0, workflow_service_1.findWorkflowByIntent)(intentResult.intent_key);
    if (!workflow) {
        res.status(404).json({
            error: "No workflow found",
            message: `No active workflow registered for intent: ${intentResult.intent_key}`,
        });
        return;
    }
    console.log(`[tasks] Workflow selected: "${workflow.workflow_name}"`);
    // 4. Execute workflow
    const executionResult = await (0, workflow_service_1.executeWorkflow)(workflow, trimmedInput);
    console.log(`[tasks] Execution ${executionResult.execution_id} — ${executionResult.status}`);
    // 5. Return result
    // Always 200 — the HTTP request succeeded even if the workflow failed.
    // Consumers check execution result.status for workflow-level success/failure.
    res.status(200).json({
        execution_id: executionResult.execution_id,
        workflow_name: executionResult.workflow_name,
        intent_key: executionResult.intent_key,
        status: executionResult.status,
        result: executionResult.result,
        error: executionResult.error,
    });
});
