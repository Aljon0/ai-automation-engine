"use client";

/**
 * app/dashboard/page.tsx
 *
 * Phase 10 — Redesigned Analytics Dashboard
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  fetchAnalytics,
  AnalyticsData,
  WorkflowMetric,
  RecentExecution,
} from "@/lib/api";

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
  const absMs = Math.abs(ms);
  if (absMs < 1000) return `${absMs}ms`;
  return `${(absMs / 1000).toFixed(1)}s`;
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

function successRateColor(rate: number): string {
  if (rate >= 80) return "var(--color-success)";
  if (rate >= 50) return "var(--color-warning)";
  return "var(--color-error)";
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
          message: err instanceof Error ? err.message : "Failed to load analytics",
        })
      );
  }, []);

  return (
    <div className="page-container">

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Dashboard
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
          Operational metrics for your automation workflows.
        </p>
      </div>

      {/* Loading */}
      {state.phase === "loading" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ height: 96, borderRadius: 12, background: "var(--color-surface)", animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
          <div style={{ height: 240, borderRadius: 12, background: "var(--color-surface)", animation: "pulse 1.5s infinite" }} />
          <div style={{ height: 320, borderRadius: 12, background: "var(--color-surface)", animation: "pulse 1.5s infinite" }} />
        </div>
      )}

      {/* Error */}
      {state.phase === "error" && (
        <div className="card" style={{ borderColor: "var(--color-error)", padding: "1rem 1.25rem" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--color-error)" }}>{state.message}</p>
        </div>
      )}

      {/* Dashboard */}
      {state.phase === "success" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
            <SummaryCard
              label="Total Executions"
              value={state.data.summary.total_executions.toString()}
              sub={`${state.data.summary.pending_executions} pending`}
              valueColor="var(--color-text)"
            />
            <SummaryCard
              label="Success Rate"
              value={`${state.data.summary.success_rate}%`}
              sub={`${state.data.summary.successful_executions} of ${state.data.summary.total_executions} succeeded`}
              valueColor={successRateColor(state.data.summary.success_rate)}
            />
            <SummaryCard
              label="Avg Duration"
              value={formatDuration(state.data.summary.avg_duration_ms)}
              sub="per completed execution"
              valueColor="var(--color-text)"
            />
            <SummaryCard
              label="Active Workflows"
              value={state.data.summary.active_workflows.toString()}
              sub={`${state.data.summary.failed_executions} failed executions`}
              valueColor="var(--color-text)"
            />
          </div>

          {/* Workflow Breakdown */}
          <WorkflowBreakdown workflows={state.data.by_workflow} />

          {/* Recent Activity */}
          <RecentActivity executions={state.data.recent} />

          {/* Footer */}
          <p style={{ fontSize: "0.6875rem", color: "var(--color-text-faint)", textAlign: "right" }}>
            Generated {new Date(state.data.generated_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SummaryCard
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub: string;
  valueColor: string;
}) {
  return (
    <div className="card" style={{ padding: "1.25rem" }}>
      <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
        {label}
      </p>
      <p style={{
        fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.03em",
        color: valueColor, marginBottom: "0.25rem", lineHeight: 1,
      }}>
        {value}
      </p>
      <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)" }}>
        {sub}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkflowBreakdown
// ---------------------------------------------------------------------------

function WorkflowBreakdown({ workflows }: { workflows: WorkflowMetric[] }) {
  const maxRuns = Math.max(...workflows.map((w) => w.total_runs), 1);

  return (
    <div className="card">
      <div className="card-header">
        <span className="section-label">Workflow Usage</span>
        <span style={{ fontSize: "0.75rem", color: "var(--color-text-faint)" }}>
          {workflows.length} workflows
        </span>
      </div>

      {workflows.length === 0 ? (
        <div style={{ padding: "3rem 1.25rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
            No executions yet.
          </p>
          <Link href="/" style={{ fontSize: "0.8125rem", color: "var(--color-text-subtle)", textDecoration: "none" }}>
            Run your first task →
          </Link>
        </div>
      ) : (
        <div style={{ padding: "0.5rem 0" }}>
          {workflows.map((wf, idx) => (
            <div
              key={wf.workflow_id}
              style={{
                padding: "1rem 1.25rem",
                borderTop: idx > 0 ? "1px solid var(--color-border-subtle)" : undefined,
              }}
            >
              {/* Name + stats row */}
              <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between", gap: "1rem",
                marginBottom: "0.625rem",
              }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text)" }}>
                    {wf.workflow_name}
                  </span>
                  <code style={{
                    fontSize: "0.6875rem", color: "var(--color-text-faint)",
                    background: "var(--color-bg)", padding: "0.125rem 0.375rem",
                    borderRadius: 4, marginLeft: "0.5rem",
                  }}>
                    {wf.intent_key}
                  </code>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-faint)" }}>
                    {wf.total_runs} runs
                  </span>
                  <span style={{
                    fontSize: "0.8125rem", fontWeight: 600,
                    color: successRateColor(wf.success_rate),
                  }}>
                    {wf.success_rate}%
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-faint)" }}>
                    {formatDuration(wf.avg_duration_ms)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{
                height: 4, background: "var(--color-surface-2)",
                borderRadius: 2, overflow: "hidden", marginBottom: "0.5rem",
              }}>
                <div style={{
                  height: "100%",
                  width: `${(wf.total_runs / maxRuns) * 100}%`,
                  background: "var(--color-accent)",
                  borderRadius: 2,
                  transition: "width 0.5s ease",
                }} />
              </div>

              {/* Success/failed breakdown */}
              <div style={{ display: "flex", gap: "1rem" }}>
                <span style={{ fontSize: "0.6875rem", color: "var(--color-success)" }}>
                  {wf.successful_runs} success
                </span>
                <span style={{ fontSize: "0.6875rem", color: "var(--color-error)" }}>
                  {wf.failed_runs} failed
                </span>
                <span style={{ fontSize: "0.6875rem", color: "var(--color-text-faint)" }}>
                  avg {formatDuration(wf.avg_duration_ms)}
                </span>
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
    <div className="card">
      <div className="card-header">
        <span className="section-label">Recent Activity</span>
        <Link
          href="/runs"
          style={{ fontSize: "0.75rem", color: "var(--color-text-subtle)", textDecoration: "none" }}
        >
          View all →
        </Link>
      </div>

      {executions.length === 0 ? (
        <div style={{ padding: "3rem 1.25rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
            No executions yet.
          </p>
          <Link href="/" style={{ fontSize: "0.8125rem", color: "var(--color-text-subtle)", textDecoration: "none" }}>
            Run your first task →
          </Link>
        </div>
      ) : (
        <div>
          {executions.map((exec, idx) => {
            const durationMs = exec.duration_ms;
            const statusColor =
              exec.status === "success" ? "var(--color-success)"
              : exec.status === "failed" ? "var(--color-error)"
              : "var(--color-text-faint)";

            return (
              <div
                key={exec.id}
                style={{
                  display: "flex", alignItems: "center", gap: "0.875rem",
                  padding: "0.75rem 1.25rem",
                  borderTop: idx > 0 ? "1px solid var(--color-border-subtle)" : undefined,
                }}
              >
                {/* Status dot */}
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: statusColor, flexShrink: 0,
                  animation: exec.status === "pending" ? "pulse 1s infinite" : undefined,
                }} />

                {/* Input */}
                <span style={{
                  fontSize: "0.875rem", color: "var(--color-text)",
                  flex: 1, minWidth: 0, overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {exec.input}
                </span>

                {/* Workflow */}
                <span style={{
                  fontSize: "0.75rem", color: "var(--color-text-muted)",
                  flexShrink: 0,
                }}>
                  {exec.workflow_name}
                </span>

                {/* Duration */}
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", flexShrink: 0 }}>
                  {formatDuration(durationMs ?? 0)}
                </span>

                {/* Time ago */}
                <span style={{
                  fontSize: "0.75rem", color: "var(--color-text-faint)",
                  flexShrink: 0, minWidth: 60, textAlign: "right",
                }}>
                  {formatTimeAgo(exec.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}