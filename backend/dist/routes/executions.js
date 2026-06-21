"use strict";
/**
 * routes/executions.ts
 *
 * Phase 9 update: all routes require auth and filter by user_id.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executionsRouter = void 0;
const express_1 = require("express");
const execution_service_1 = require("../services/execution.service");
const auth_1 = require("../middleware/auth");
exports.executionsRouter = (0, express_1.Router)();
// Apply auth to all execution routes
exports.executionsRouter.use(auth_1.requireAuth);
exports.executionsRouter.get("/stats", async (req, res) => {
    const stats = await (0, execution_service_1.getExecutionStats)(req.user.id);
    res.status(200).json(stats);
});
exports.executionsRouter.get("/", async (req, res) => {
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10), 100);
    const offset = Math.max(parseInt(String(req.query.offset ?? "0"), 10), 0);
    const status = req.query.status;
    if (status && !["pending", "success", "failed"].includes(status)) {
        res.status(400).json({
            error: "Invalid status filter",
            message: "status must be one of: pending, success, failed",
        });
        return;
    }
    const result = await (0, execution_service_1.listExecutions)({ limit, offset, status }, req.user.id);
    res.status(200).json(result);
});
exports.executionsRouter.get("/:id", async (req, res) => {
    const id = String(req.params.id);
    // Basic UUID format check
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        res.status(400).json({
            error: "Invalid ID",
            message: "Execution ID must be a valid UUID",
        });
        return;
    }
    const execution = await (0, execution_service_1.getExecutionById)(id);
    if (!execution) {
        res.status(404).json({
            error: "Not found",
            message: `No execution found with ID: ${id}`,
        });
        return;
    }
    res.status(200).json(execution);
});
