"use strict";
/**
 * routes/workflows.ts
 *
 * GET /api/workflows
 *
 * Returns the list of active workflows from the registry.
 * Used by the frontend to display available automations as context.
 *
 * No request body needed — this is a pure read endpoint.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowsRouter = void 0;
const express_1 = require("express");
const registry_service_1 = require("../services/registry.service");
exports.workflowsRouter = (0, express_1.Router)();
// ---------------------------------------------------------------------------
// GET /api/workflows
// ---------------------------------------------------------------------------
exports.workflowsRouter.get("/", async (_req, res) => {
    const workflows = await (0, registry_service_1.listActiveWorkflows)();
    const body = {
        workflows,
        count: workflows.length,
    };
    res.status(200).json(body);
});
