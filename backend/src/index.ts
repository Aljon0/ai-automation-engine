import "dotenv/config";

// WebSocket polyfill required by @supabase/supabase-js in Node.js 20
// Must be imported before any Supabase client is initialized
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

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(
  cors({
    origin: config.corsOrigin,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

// Request logger — lightweight, no dependency needed
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use("/health", healthRouter);
app.use("/api/tasks", tasksRouter);

// 404 — unmatched routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(`[error] ${err.message}`);
  res.status(500).json({ error: "Internal server error" });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(config.port, () => {
  console.log(`[server] Running on http://localhost:${config.port}`);
  console.log(`[server] Environment: ${config.nodeEnv}`);
  console.log(`[server] CORS origin: ${config.corsOrigin}`);
  console.log(`[server] Health check: http://localhost:${config.port}/health`);
  console.log(`[server] Tasks API:    http://localhost:${config.port}/api/tasks`);
});