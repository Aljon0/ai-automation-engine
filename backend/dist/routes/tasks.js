"use strict";
/**
 * routes/tasks.ts
 *
 * POST /api/tasks
 *
 * Phase 9 update: requires authentication.
 * Attaches user_id to execution record.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tasksRouter = void 0;
const express_1 = require("express");
const intent_service_1 = require("../services/intent.service");
const workflow_service_1 = require("../services/workflow.service");
const sse_1 = require("../lib/sse");
const auth_1 = require("../middleware/auth");
exports.tasksRouter = (0, express_1.Router)();
exports.tasksRouter.post("/", auth_1.requireAuth, async (req, res) => {
    const { input, file_url, file_name, file_type } = req.body;
    const userId = req.user.id;
    if (!input || typeof input !== "string" || input.trim().length === 0) {
        res.status(400).json({
            error: "Validation failed",
            message: "Request body must include a non-empty string field: input",
        });
        return;
    }
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
    const intentResult = await (0, intent_service_1.detectIntent)(trimmedInput);
    if (!(0, intent_service_1.isIntentDetected)(intentResult)) {
        res.status(422).json({
            error: "Intent not recognized",
            message: intentResult.reason,
        });
        return;
    }
    console.log(`[tasks] Intent: "${intentResult.intent_key}" via ${intentResult.method} — user: ${userId.slice(0, 8)}`);
    const workflow = await (0, workflow_service_1.findWorkflowByIntent)(intentResult.intent_key);
    if (!workflow) {
        res.status(404).json({
            error: "No workflow found",
            message: `No active workflow registered for intent: ${intentResult.intent_key}`,
        });
        return;
    }
    const fileMetadata = hasFile &&
        typeof file_url === "string" &&
        typeof file_name === "string" &&
        typeof file_type === "string"
        ? { file_url, file_name, file_type }
        : undefined;
    const executionResult = await (0, workflow_service_1.executeWorkflow)(workflow, trimmedInput, fileMetadata, userId);
    const executionId = executionResult.execution_id;
    (0, sse_1.emitExecutionEvent)(executionId, "intent_detected", {
        intent_key: intentResult.intent_key,
        method: intentResult.method,
        matched_term: intentResult.matched_term,
    });
    (0, sse_1.emitExecutionEvent)(executionId, "workflow_selected", {
        workflow_name: workflow.workflow_name,
        intent_key: workflow.intent_key,
    });
    (0, sse_1.emitExecutionEvent)(executionId, "n8n_triggered", {
        workflow_name: workflow.workflow_name,
    });
    if (executionResult.status === "success") {
        (0, sse_1.emitExecutionEvent)(executionId, "completed", {
            status: "success",
            result: executionResult.result,
        });
    }
    else {
        (0, sse_1.emitExecutionEvent)(executionId, "failed", {
            status: "failed",
            error: executionResult.error,
        });
    }
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
