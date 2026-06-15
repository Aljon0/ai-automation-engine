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

import { Router, Request, Response } from "express";
import { pingSupabase } from "../lib/supabase";
import { pingN8n } from "../lib/n8n";

export const healthRouter = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ServiceStatus =
  | { status: "up" }
  | { status: "down"; error: string };

interface HealthResponse {
  status: "healthy" | "degraded";
  timestamp: string;
  services: {
    supabase: ServiceStatus;
    n8n: ServiceStatus;
  };
}

// ---------------------------------------------------------------------------
// GET /health/live — process liveness (used by Docker healthcheck)
// ---------------------------------------------------------------------------

healthRouter.get("/live", (_req: Request, res: Response) => {
  res.status(200).json({ status: "alive" });
});

// ---------------------------------------------------------------------------
// GET /health — full dependency check (Supabase + n8n)
// ---------------------------------------------------------------------------

healthRouter.get("/", async (_req: Request, res: Response) => {
  // Run all pings in parallel — don't let one slow service block the others
  const [supabaseResult, n8nResult] = await Promise.all([
    pingSupabase(),
    pingN8n(),
  ]);

  const services: HealthResponse["services"] = {
    supabase: supabaseResult.ok
      ? { status: "up" }
      : { status: "down", error: supabaseResult.error },

    n8n: n8nResult.ok
      ? { status: "up" }
      : { status: "down", error: n8nResult.error },
  };

  const allUp = Object.values(services).every((s) => s.status === "up");

  const body: HealthResponse = {
    status: allUp ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    services,
  };

  // 200 = all up, 503 = one or more services unreachable
  res.status(allUp ? 200 : 503).json(body);
});