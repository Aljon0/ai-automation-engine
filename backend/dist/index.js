"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
// WebSocket polyfill required by @supabase/supabase-js in Node.js 20
const ws_1 = require("ws");
if (!globalThis.WebSocket) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.WebSocket = ws_1.WebSocket;
}
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const health_1 = require("./routes/health");
const tasks_1 = require("./routes/tasks");
const workflows_1 = require("./routes/workflows");
const upload_1 = require("./routes/upload");
const executions_1 = require("./routes/executions");
const extract_1 = require("./routes/extract");
const stream_1 = require("./routes/stream");
const analytics_1 = require("./routes/analytics");
const requestId_1 = require("./middleware/requestId");
const rateLimit_1 = require("./middleware/rateLimit");
const app = (0, express_1.default)();
// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use((0, cors_1.default)({
    origin: config_1.config.corsOrigin,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Cache-Control", "Authorization"],
}));
app.use(express_1.default.json());
app.use(requestId_1.requestIdMiddleware);
// Request logger
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${req.requestId?.slice(0, 8)}`);
    next();
});
// ---------------------------------------------------------------------------
// Routes — with rate limits applied per route type
// ---------------------------------------------------------------------------
app.use("/health", health_1.healthRouter);
app.use("/api/tasks", rateLimit_1.aiRateLimit, tasks_1.tasksRouter);
app.use("/api/workflows", rateLimit_1.readRateLimit, workflows_1.workflowsRouter);
app.use("/api/upload", rateLimit_1.uploadRateLimit, upload_1.uploadRouter);
app.use("/api/executions", rateLimit_1.readRateLimit, executions_1.executionsRouter);
app.use("/api/extract", rateLimit_1.aiRateLimit, extract_1.extractRouter);
app.use("/api/stream", stream_1.streamRouter);
app.use("/api/analytics", rateLimit_1.readRateLimit, analytics_1.analyticsRouter);
// 404
app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
});
// Global error handler — includes request ID for tracing
app.use((err, req, res, _next) => {
    console.error(`[error] ${req.requestId?.slice(0, 8)} — ${err.message}`);
    res.status(500).json({
        error: "Internal server error",
        request_id: req.requestId,
    });
});
// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(config_1.config.port, () => {
    console.log(`[server] Running on http://localhost:${config_1.config.port}`);
    console.log(`[server] Environment: ${config_1.config.nodeEnv}`);
    console.log(`[server] CORS origin: ${config_1.config.corsOrigin}`);
    console.log(`[server] Rate limiting: enabled`);
});
