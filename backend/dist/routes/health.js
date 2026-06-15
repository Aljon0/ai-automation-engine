"use strict";
/**
 * routes/health.ts
 *
 * GET /health
 *
 * Pings every downstream service in parallel and returns a structured
 * status report. HTTP 200 if all services are up, 503 if any are down.
 *
 * This is the Phase 0 proof-of-life route — if this returns 200, the
 * entire infrastructure is wired correctly.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const n8n_1 = require("../lib/n8n");
exports.healthRouter = (0, express_1.Router)();
// ---------------------------------------------------------------------------
// GET /health/live — process liveness (used by Docker healthcheck)
// ---------------------------------------------------------------------------
exports.healthRouter.get("/live", (_req, res) => {
    res.status(200).json({ status: "alive" });
});
// ---------------------------------------------------------------------------
// GET /health — full dependency check (Supabase + n8n)
// ---------------------------------------------------------------------------
exports.healthRouter.get("/", async (_req, res) => {
    // Run all pings in parallel — don't let one slow service block the others
    const [supabaseResult, n8nResult] = await Promise.all([
        (0, supabase_1.pingSupabase)(),
        (0, n8n_1.pingN8n)(),
    ]);
    const services = {
        supabase: supabaseResult.ok
            ? { status: "up" }
            : { status: "down", error: supabaseResult.error },
        n8n: n8nResult.ok
            ? { status: "up" }
            : { status: "down", error: n8nResult.error },
    };
    const allUp = Object.values(services).every((s) => s.status === "up");
    const body = {
        status: allUp ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        services,
    };
    // 200 = all up, 503 = one or more services unreachable
    res.status(allUp ? 200 : 503).json(body);
});
