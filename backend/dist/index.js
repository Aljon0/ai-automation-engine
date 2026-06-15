"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
// WebSocket polyfill required by @supabase/supabase-js in Node.js 20
// Must be imported before any Supabase client is initialized
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
const app = (0, express_1.default)();
// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use((0, cors_1.default)({
    origin: config_1.config.corsOrigin,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
}));
app.use(express_1.default.json());
// Request logger — lightweight, no dependency needed
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});
// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use("/health", health_1.healthRouter);
app.use("/api/tasks", tasks_1.tasksRouter);
// 404 — unmatched routes
app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
});
// Global error handler
app.use((err, _req, res, _next) => {
    console.error(`[error] ${err.message}`);
    res.status(500).json({ error: "Internal server error" });
});
// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(config_1.config.port, () => {
    console.log(`[server] Running on http://localhost:${config_1.config.port}`);
    console.log(`[server] Environment: ${config_1.config.nodeEnv}`);
    console.log(`[server] CORS origin: ${config_1.config.corsOrigin}`);
    console.log(`[server] Health check: http://localhost:${config_1.config.port}/health`);
    console.log(`[server] Tasks API:    http://localhost:${config_1.config.port}/api/tasks`);
});
