"use client";

/**
 * app/dashboard/page.tsx
 *
 * Phase 8 — Analytics Dashboard
 *
 * Displays:
 * - Summary stats (total, success rate, avg duration, active workflows)
 * - Per-workflow usage breakdown with bar chart
 * - Recent execution timeline
 */

import {
  AnalyticsData,
  fetchAnalytics,
  RecentExecution,
  WorkflowMetric,
} from "@/lib/api";
import Link from "next/link";
import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DataState =
  | { phase: "loading" }
  | { phase: "success"; data: AnalyticsData }
  | { phase: "error"; message: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(ms: number): string {
  if (ms === 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [state, setState] = useState<DataState>({ phase: "loading" });

  useEffect(() => {
    fetchAnalytics()
      .then((data) => setState({ phase: "success", data }))
      .catch((err) =>
        setState({
          phase: "error",
          message:
            err instanceof Error ? err.message : "Failed to load analytics",
        }),
      );
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 font-mono px-4 py-12 pt-20">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-1">
              AI Workflow Automation Engine
            </p>
            <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/runs"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors border border-zinc-800 rounded-md px-3 py-1.5"
            >
              View Runs
            </Link>
            <Link
              href="/"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors border border-zinc-800 rounded-md px-3 py-1.5"
            >
              New Task
            </Link>
          </div>
        </div>

        {/* Loading */}
        {state.phase === "loading" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="border border-zinc-800 rounded-lg p-4 h-20 animate-pulse bg-zinc-900/40"
                />
              ))}
            </div>
            <div className="border border-zinc-800 rounded-lg p-6 h-48 animate-pulse bg-zinc-900/40" />
            <div className="border border-zinc-800 rounded-lg p-6 h-64 animate-pulse bg-zinc-900/40" />
          </div>
        )}

        {/* Error */}
        {state.phase === "error" && (
          <div className="border border-red-800 rounded-lg px-4 py-3">
            <p className="text-xs text-red-400">{state.message}</p>
          </div>
        )}

        {/* Dashboard content */}
        {state.phase === "success" && (
          <>
            <SummaryCards data={state.data} />
            <WorkflowBreakdown workflows={state.data.by_workflow} />
            <RecentActivity executions={state.data.recent} />
            <p className="text-xs text-zinc-700 text-right">
              Generated {formatTime(state.data.generated_at)}
            </p>
          </>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// SummaryCards
// ---------------------------------------------------------------------------

function SummaryCards({ data }: { data: AnalyticsData }) {
  const { summary } = data;

  const cards = [
    {
      label: "Total Runs",
      value: summary.total_executions.toString(),
      sub: `${summary.pending_executions} pending`,
      color: "text-zinc-100",
    },
    {
      label: "Success Rate",
      value: `${summary.success_rate}%`,
      sub: `${summary.successful_executions} succeeded`,
      color:
        summary.success_rate >= 80
          ? "text-emerald-400"
          : summary.success_rate >= 50
            ? "text-yellow-400"
            : "text-red-400",
    },
    {
      label: "Avg Duration",
      value: formatDuration(summary.avg_duration_ms),
      sub: "per execution",
      color: "text-zinc-100",
    },
    {
      label: "Active Workflows",
      value: summary.active_workflows.toString(),
      sub: `${summary.failed_executions} failed runs`,
      color: "text-zinc-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map(({ label, value, sub, color }) => (
        <div
          key={label}
          className="border border-zinc-800 rounded-lg p-4 space-y-1"
        >
          <p className="text-xs text-zinc-600">{label}</p>
          <p className={`text-2xl font-semibold ${color}`}>{value}</p>
          <p className="text-xs text-zinc-600">{sub}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkflowBreakdown
// ---------------------------------------------------------------------------

function WorkflowBreakdown({ workflows }: { workflows: WorkflowMetric[] }) {
  const maxRuns = Math.max(...workflows.map((w) => w.total_runs), 1);

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800">
        <p className="text-xs tracking-widest text-zinc-500 uppercase">
          Workflow Usage
        </p>
      </div>

      {workflows.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-xs text-zinc-600">No workflow executions yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/60">
          {workflows.map((wf) => (
            <div key={wf.workflow_id} className="px-5 py-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium text-zinc-200 truncate">
                    {wf.workflow_name}
                  </span>
                  <span className="text-xs text-zinc-600 font-mono shrink-0">
                    {wf.intent_key}
                  </span>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <span className="text-xs text-zinc-500">
                    {wf.total_runs} runs
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      wf.success_rate >= 80
                        ? "text-emerald-400"
                        : wf.success_rate >= 50
                          ? "text-yellow-400"
                          : "text-red-400"
                    }`}
                  >
                    {wf.success_rate}%
                  </span>
                  <span className="text-xs text-zinc-600">
                    {formatDuration(wf.avg_duration_ms)}
                  </span>
                </div>
              </div>

              {/* Usage bar */}
              <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                <div className="h-full flex">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{
                      width: `${(wf.total_runs / maxRuns) * 100}%`,
                      opacity: 0.8,
                    }}
                  />
                </div>
              </div>

              {/* Success / Failed breakdown */}
              <div className="flex items-center gap-3 text-xs text-zinc-600">
                <span className="text-emerald-500">
                  {wf.successful_runs} success
                </span>
                <span>·</span>
                <span className="text-red-400">{wf.failed_runs} failed</span>
                <span>·</span>
                <span>avg {formatDuration(wf.avg_duration_ms)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecentActivity
// ---------------------------------------------------------------------------

function RecentActivity({ executions }: { executions: RecentExecution[] }) {
  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800">
        <p className="text-xs tracking-widest text-zinc-500 uppercase">
          Recent Activity
        </p>
      </div>

      {executions.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-xs text-zinc-600">No executions yet.</p>
          <Link
            href="/"
            className="text-xs text-zinc-500 hover:text-zinc-400 mt-2 inline-block transition-colors"
          >
            Run your first task →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/60">
          {executions.map((exec) => (
            <div key={exec.id} className="px-5 py-3 flex items-center gap-3">
              {/* Status dot */}
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  exec.status === "success"
                    ? "bg-emerald-400"
                    : exec.status === "failed"
                      ? "bg-red-500"
                      : "bg-zinc-500 animate-pulse"
                }`}
              />

              {/* Input preview */}
              <span className="text-xs text-zinc-300 truncate flex-1 min-w-0">
                {exec.input}
              </span>

              {/* Workflow name */}
              <span className="text-xs text-zinc-600 shrink-0 hidden sm:block">
                {exec.workflow_name}
              </span>

              {/* Duration */}
              {exec.duration_ms !== null && (
                <span className="text-xs text-zinc-600 shrink-0">
                  {formatDuration(exec.duration_ms)}
                </span>
              )}

              {/* Time ago */}
              <span className="text-xs text-zinc-700 shrink-0">
                {formatTimeAgo(exec.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
