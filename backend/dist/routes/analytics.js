"use strict";
/**
 * routes/analytics.ts
 *
 * GET /api/analytics
 *
 * Returns all dashboard metrics in a single response.
 * Calls analytics.service.ts which aggregates all data server-side.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRouter = void 0;
const express_1 = require("express");
const analytics_service_1 = require("../services/analytics.service");
exports.analyticsRouter = (0, express_1.Router)();
// ---------------------------------------------------------------------------
// GET /api/analytics
// ---------------------------------------------------------------------------
exports.analyticsRouter.get("/", async (_req, res) => {
    const data = await (0, analytics_service_1.getAnalytics)();
    res.status(200).json(data);
});
