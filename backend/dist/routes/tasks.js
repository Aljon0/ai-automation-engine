"use strict";
/**
 * routes/tasks.ts
 *
 * POST /api/tasks
 *
 * Phase 4 update: accepts optional file metadata from a prior
 * POST /api/upload call. File fields are passed to n8n so workflows
 * can fetch and process the uploaded file.
 *
 * Flow:
 * 1. Validate request body (input required, file fields optional)
 * 2. Detect intent from input
 * 3. Find matching workflow in registry
 * 4. Execute workflow (trigger n8n with input + optional file)
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
    const { input, file_url, file_name, file_type } = req.body;
    // 1. Validate input
    if (!input || typeof input !== "string" || input.trim().length === 0) {
        res.status(400).json({
            error: "Validation failed",
            message: "Request body must include a non-empty string field: input",
        });
        return;
    }
    // Validate optional file fields — if one is provided, all must be
    const hasFile = file_url || file_name || file_type;
    if (hasFile) {
        if (typeof file_url !== "string" ||
            typeof file_name !== "string" ||
            typeof file_type !== "string") {
            res.status(400).json({
                error: "Validation failed",
                message: "If providing a file, include all three fields: file_url, file_name, file_type",
            });
            return;
        }
    }
    const trimmedInput = input.trim();
    // 2. Detect intent
    const intentResult = await (0, intent_service_1.detectIntent)(trimmedInput);
    if (!(0, intent_service_1.isIntentDetected)(intentResult)) {
        res.status(422).json({
            error: "Intent not recognized",
            message: intentResult.reason,
        });
        return;
    }
    console.log(`[tasks] Intent detected: "${intentResult.intent_key}" via ${intentResult.method}`);
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
    // 4. Build file metadata (undefined if no file attached)
    const fileMetadata = hasFile &&
        typeof file_url === "string" &&
        typeof file_name === "string" &&
        typeof file_type === "string"
        ? { file_url, file_name, file_type }
        : undefined;
    // 5. Execute workflow
    const executionResult = await (0, workflow_service_1.executeWorkflow)(workflow, trimmedInput, fileMetadata);
    console.log(`[tasks] Execution ${executionResult.execution_id} — ${executionResult.status}`);
    // 6. Return result
    res.status(200).json({
        execution_id: executionResult.execution_id,
        workflow_name: executionResult.workflow_name,
        intent_key: executionResult.intent_key,
        status: executionResult.status,
        result: executionResult.result,
        error: executionResult.error,
        file_name: fileMetadata?.file_name ?? null,
    });
});
