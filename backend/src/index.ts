import "dotenv/config";

// WebSocket polyfill required by @supabase/supabase-js in Node.js 20
import { WebSocket } from "ws";
if (!globalThis.WebSocket) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).WebSocket = WebSocket;
}

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { config } from "./config";
import { healthRouter } from "./routes/health";
import { tasksRouter } from "./routes/tasks";
import { workflowsRouter } from "./routes/workflows";
import { uploadRouter } from "./routes/upload";
import { executionsRouter } from "./routes/executions";
import { extractRouter } from "./routes/extract";
import { streamRouter } from "./routes/stream";
import { analyticsRouter } from "./routes/analytics";
import { requestIdMiddleware } from "./middleware/requestId";
import {
  aiRateLimit,
  uploadRateLimit,
  readRateLimit,
} from "./middleware/rateLimit";

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(
  cors({
    origin: config.corsOrigin,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Cache-Control", "Authorization"],
  })
);

app.use(express.json());
app.use(requestIdMiddleware);

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.path} — ${req.requestId?.slice(0, 8)}`
  );
  next();
});

// ---------------------------------------------------------------------------
// Routes — with rate limits applied per route type
// ---------------------------------------------------------------------------

app.use("/health", healthRouter);
app.use("/api/tasks", aiRateLimit, tasksRouter);
app.use("/api/workflows", readRateLimit, workflowsRouter);
app.use("/api/upload", uploadRateLimit, uploadRouter);
app.use("/api/executions", readRateLimit, executionsRouter);
app.use("/api/extract", aiRateLimit, extractRouter);
app.use("/api/stream", streamRouter);
app.use("/api/analytics", readRateLimit, analyticsRouter);

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler — includes request ID for tracing
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(`[error] ${req.requestId?.slice(0, 8)} — ${err.message}`);
  res.status(500).json({
    error: "Internal server error",
    request_id: req.requestId,
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(config.port, () => {
  console.log(`[server] Running on http://localhost:${config.port}`);
  console.log(`[server] Environment: ${config.nodeEnv}`);
  console.log(`[server] CORS origin: ${config.corsOrigin}`);
  console.log(`[server] Rate limiting: enabled`);
});