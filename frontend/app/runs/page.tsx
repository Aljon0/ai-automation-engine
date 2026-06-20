"use client";

/**
 * app/runs/page.tsx
 *
 * Phase 5 — Workflow Execution History
 *
 * Shows all past workflow executions with:
 * - Summary stats header (total, success, failed)
 * - Filterable execution list (all, success, failed)
 * - Expandable rows showing full result JSON
 * - File attachment indicator
 */

import {
  ExecutionDetail,
  ExecutionListItem,
  ExecutionStats,
  fetchExecutionById,
  fetchExecutions,
  fetchExecutionStats,
  ListExecutionsOptions,
} from "@/lib/api";
import Link from "next/link";
import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StatsState =
  | { phase: "loading" }
  | { phase: "success"; data: ExecutionStats }
  | { phase: "error" };

type ListState =
  | { phase: "loading" }
  | { phase: "success"; executions: ExecutionListItem[]; total: number }
  | { phase: "error"; message: string };

type DetailState =
  | { phase: "idle" }
  | { phase: "loading"; id: string }
  | { phase: "success"; data: ExecutionDetail }
  | { phase: "error"; message: string };

type StatusFilter = "all" | "success" | "failed" | "pending";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RunsPage() {
  const [statsState, setStatsState] = useState<StatsState>({
    phase: "loading",
  });
  const [listState, setListState] = useState<ListState>({ phase: "loading" });
  const [detailState, setDetailState] = useState<DetailState>({
    phase: "idle",
  });
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load stats once on mount
  useEffect(() => {
    fetchExecutionStats()
      .then((data) => setStatsState({ phase: "success", data }))
      .catch(() => setStatsState({ phase: "error" }));
  }, []);

  // Reload list when filter changes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setListState({ phase: "loading" });
      try {
        const options: ListExecutionsOptions = { limit: 50 };
        if (filter !== "all") options.status = filter;
        const result = await fetchExecutions(options);
        if (!cancelled) {
          setListState({
            phase: "success",
            executions: result.executions,
            total: result.total,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setListState({
            phase: "error",
            message:
              err instanceof Error ? err.message : "Failed to load executions",
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  async function handleExpand(execution: ExecutionListItem) {
    if (expandedId === execution.id) {
      setExpandedId(null);
      setDetailState({ phase: "idle" });
      return;
    }

    setExpandedId(execution.id);
    setDetailState({ phase: "loading", id: execution.id });

    try {
      const data = await fetchExecutionById(execution.id);
      setDetailState({ phase: "success", data });
    } catch (err) {
      setDetailState({
        phase: "error",
        message: err instanceof Error ? err.message : "Failed to load detail",
      });
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 font-mono px-4 py-12 pt-20">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-1">
              AI Workflow Automation Engine
            </p>
            <h1 className="text-xl font-semibold tracking-tight">
              Workflow Runs
            </h1>
          </div>
          <Link
            href="/"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors border border-zinc-800 rounded-md px-3 py-1.5"
          >
            New Task
          </Link>
        </div>

        {/* Stats */}
        <StatsBar state={statsState} />

        {/* Filter tabs */}
        <div className="flex gap-1 border-b border-zinc-800 pb-0">
          {(["all", "success", "failed", "pending"] as StatusFilter[]).map(
            (f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-2 capitalize transition-colors border-b-2 -mb-px ${
                  filter === f
                    ? "text-zinc-100 border-zinc-400"
                    : "text-zinc-500 border-transparent hover:text-zinc-300"
                }`}
              >
                {f}
              </button>
            ),
          )}
        </div>

        {/* Execution list */}
        <ExecutionList
          state={listState}
          expandedId={expandedId}
          detailState={detailState}
          onExpand={handleExpand}
        />
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// StatsBar
// ---------------------------------------------------------------------------

function StatsBar({ state }: { state: StatsState }) {
  if (state.phase === "loading") {
    return (
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="border border-zinc-800 rounded-lg p-4 animate-pulse bg-zinc-900/40 h-16"
          />
        ))}
      </div>
    );
  }

  if (state.phase === "error") return null;

  const stats = [
    { label: "Total", value: state.data.total, color: "text-zinc-300" },
    { label: "Success", value: state.data.success, color: "text-emerald-400" },
    { label: "Failed", value: state.data.failed, color: "text-red-400" },
    { label: "Pending", value: state.data.pending, color: "text-zinc-500" },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map(({ label, value, color }) => (
        <div
          key={label}
          className="border border-zinc-800 rounded-lg p-4 space-y-1"
        >
          <p className="text-xs text-zinc-600">{label}</p>
          <p className={`text-xl font-semibold ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExecutionList
// ---------------------------------------------------------------------------

interface ExecutionListProps {
  state: ListState;
  expandedId: string | null;
  detailState: DetailState;
  onExpand: (execution: ExecutionListItem) => void;
}

function ExecutionList({
  state,
  expandedId,
  detailState,
  onExpand,
}: ExecutionListProps) {
  if (state.phase === "loading") {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="border border-zinc-800 rounded-lg h-16 animate-pulse bg-zinc-900/40"
          />
        ))}
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="border border-red-800 rounded-lg px-4 py-3">
        <p className="text-xs text-red-400">{state.message}</p>
      </div>
    );
  }

  if (state.executions.length === 0) {
    return (
      <div className="border border-zinc-800 rounded-lg px-6 py-12 text-center">
        <p className="text-sm text-zinc-500">No executions found.</p>
        <Link
          href="/"
          className="text-xs text-zinc-600 hover:text-zinc-400 mt-2 inline-block transition-colors"
        >
          Run your first task →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {state.phase === "success" && state.total > state.executions.length && (
        <p className="text-xs text-zinc-600 text-right">
          Showing {state.executions.length} of {state.total}
        </p>
      )}
      {state.executions.map((execution) => (
        <ExecutionRow
          key={execution.id}
          execution={execution}
          isExpanded={expandedId === execution.id}
          detailState={
            expandedId === execution.id ? detailState : { phase: "idle" }
          }
          onExpand={() => onExpand(execution)}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExecutionRow
// ---------------------------------------------------------------------------

interface ExecutionRowProps {
  execution: ExecutionListItem;
  isExpanded: boolean;
  detailState: DetailState;
  onExpand: () => void;
}

function ExecutionRow({
  execution,
  isExpanded,
  detailState,
  onExpand,
}: ExecutionRowProps) {
  const isSuccess = execution.status === "success";
  const isFailed = execution.status === "failed";

  const duration = execution.completed_at
    ? Math.round(
        new Date(execution.completed_at).getTime() -
          new Date(execution.created_at).getTime(),
      ) + "ms"
    : null;

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-colors ${
        isExpanded ? "border-zinc-600" : "border-zinc-800"
      }`}
    >
      {/* Row header — always visible */}
      <button
        onClick={onExpand}
        className="w-full text-left px-4 py-3 hover:bg-zinc-900/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Status dot */}
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isSuccess
                ? "bg-emerald-400"
                : isFailed
                  ? "bg-red-500"
                  : "bg-zinc-500 animate-pulse"
            }`}
          />

          {/* Input preview */}
          <span className="text-xs text-zinc-300 truncate flex-1 min-w-0">
            {execution.input}
          </span>

          {/* File indicator */}
          {execution.file_name && (
            <span className="text-xs text-zinc-600 shrink-0 hidden sm:block">
              {execution.file_name}
            </span>
          )}

          {/* Workflow name */}
          <span className="text-xs text-zinc-500 shrink-0 hidden sm:block">
            {execution.workflow_name}
          </span>

          {/* Duration */}
          {duration && (
            <span className="text-xs text-zinc-600 shrink-0">{duration}</span>
          )}

          {/* Timestamp */}
          <span className="text-xs text-zinc-600 shrink-0">
            {new Date(execution.created_at).toLocaleString()}
          </span>

          {/* Expand chevron */}
          <span
            className={`text-zinc-600 shrink-0 transition-transform text-xs ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            ▼
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-zinc-800 px-4 py-4 space-y-3 bg-zinc-900/20">
          {/* Metadata grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetaItem label="Intent" value={execution.intent_key} />
            <MetaItem label="Status" value={execution.status} />
            <MetaItem
              label="Execution ID"
              value={execution.id.slice(0, 8) + "..."}
            />
            {duration && <MetaItem label="Duration" value={duration} />}
          </div>

          {/* File attachment */}
          {execution.file_name && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 border border-zinc-800 rounded-md px-3 py-2 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              {execution.file_name}
              <span className="text-zinc-700">·</span>
              <span className="text-zinc-700">{execution.file_type}</span>
            </div>
          )}

          {/* Result / Error detail */}
          {detailState.phase === "loading" && (
            <div className="text-xs text-zinc-600 animate-pulse">
              Loading detail...
            </div>
          )}

          {detailState.phase === "success" && (
            <div className="space-y-2">
              {detailState.data.result && (
                <div>
                  <p className="text-xs text-zinc-600 mb-1">Result</p>
                  <pre className="text-xs text-zinc-300 bg-zinc-950 rounded-md p-3 overflow-x-auto max-h-48">
                    {JSON.stringify(detailState.data.result, null, 2)}
                  </pre>
                </div>
              )}
              {detailState.data.error && (
                <div>
                  <p className="text-xs text-zinc-600 mb-1">Error</p>
                  <p className="text-xs text-red-400 bg-zinc-950 rounded-md p-3">
                    {detailState.data.error}
                  </p>
                </div>
              )}
              {detailState.data.file_url && (
                <div>
                  <p className="text-xs text-zinc-600 mb-1">File URL</p>
                  <a
                    href={detailState.data.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-400 hover:text-zinc-200 underline underline-offset-2 break-all transition-colors"
                  >
                    {detailState.data.file_url}
                  </a>
                </div>
              )}
            </div>
          )}

          {detailState.phase === "error" && (
            <p className="text-xs text-red-400">{detailState.message}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetaItem
// ---------------------------------------------------------------------------

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-zinc-600">{label}</p>
      <p className="text-xs text-zinc-300 font-medium">{value}</p>
    </div>
  );
}
