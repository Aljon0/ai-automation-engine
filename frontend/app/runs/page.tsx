"use client";

/**
 * app/runs/page.tsx
 *
 * Phase 10 — Redesigned Workflow Runs Page
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
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
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

const STATUS_FILTERS: StatusFilter[] = ["all", "success", "failed", "pending"];

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
        message: err instanceof Error ? err.message : "Failed to load",
      });
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            marginBottom: "0.5rem",
          }}
        >
          Workflow Runs
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
          History of all automation executions.
        </p>
      </div>

      {/* Stats */}
      {statsState.phase === "loading" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "0.75rem",
            marginBottom: "1.5rem",
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                height: 80,
                borderRadius: 12,
                background: "var(--color-surface)",
                animation: "pulse 1.5s infinite",
              }}
            />
          ))}
        </div>
      )}

      {statsState.phase === "success" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "0.75rem",
            marginBottom: "1.5rem",
          }}
        >
          {[
            {
              label: "Total",
              value: statsState.data.total,
              color: "var(--color-text)",
            },
            {
              label: "Success",
              value: statsState.data.success,
              color: "var(--color-success)",
            },
            {
              label: "Failed",
              value: statsState.data.failed,
              color: "var(--color-error)",
            },
            {
              label: "Pending",
              value: statsState.data.pending,
              color: "var(--color-text-muted)",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="card"
              style={{ padding: "1rem 1.25rem" }}
            >
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-text-muted)",
                  marginBottom: "0.375rem",
                }}
              >
                {label}
              </p>
              <p
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  color,
                  letterSpacing: "-0.03em",
                }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          borderBottom: "1px solid var(--color-border-subtle)",
          marginBottom: "1rem",
        }}
      >
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              fontSize: "0.8125rem",
              fontWeight: filter === f ? 500 : 400,
              color:
                filter === f ? "var(--color-text)" : "var(--color-text-subtle)",
              background: "none",
              border: "none",
              borderBottom: `2px solid ${filter === f ? "var(--color-text)" : "transparent"}`,
              padding: "0.5rem 0.75rem",
              marginBottom: -1,
              cursor: "pointer",
              textTransform: "capitalize",
              transition: "color 0.15s",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {listState.phase === "loading" && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                height: 56,
                borderRadius: 8,
                background: "var(--color-surface)",
                animation: "pulse 1.5s infinite",
              }}
            />
          ))}
        </div>
      )}

      {listState.phase === "error" && (
        <div
          className="card"
          style={{ borderColor: "var(--color-error)", padding: "1rem 1.25rem" }}
        >
          <p style={{ fontSize: "0.875rem", color: "var(--color-error)" }}>
            {listState.message}
          </p>
        </div>
      )}

      {listState.phase === "success" && listState.executions.length === 0 && (
        <div
          className="card"
          style={{ padding: "3rem 1.25rem", textAlign: "center" }}
        >
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--color-text-muted)",
              marginBottom: "0.75rem",
            }}
          >
            No executions found.
          </p>
          <Link
            href="/"
            style={{
              fontSize: "0.8125rem",
              color: "var(--color-text-subtle)",
              textDecoration: "none",
            }}
          >
            Run your first task →
          </Link>
        </div>
      )}

      {listState.phase === "success" && listState.executions.length > 0 && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}
        >
          {listState.total > listState.executions.length && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--color-text-faint)",
                textAlign: "right",
                marginBottom: "0.25rem",
              }}
            >
              Showing {listState.executions.length} of {listState.total}
            </p>
          )}
          {listState.executions.map((execution) => (
            <ExecutionRow
              key={execution.id}
              execution={execution}
              isExpanded={expandedId === execution.id}
              detailState={
                expandedId === execution.id ? detailState : { phase: "idle" }
              }
              onExpand={() => handleExpand(execution)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExecutionRow
// ---------------------------------------------------------------------------

function ExecutionRow({
  execution,
  isExpanded,
  detailState,
  onExpand,
}: {
  execution: ExecutionListItem;
  isExpanded: boolean;
  detailState: DetailState;
  onExpand: () => void;
}) {
  const duration = execution.completed_at
    ? new Date(execution.completed_at).getTime() -
      new Date(execution.created_at).getTime()
    : null;

  const statusColor =
    execution.status === "success"
      ? "var(--color-success)"
      : execution.status === "failed"
        ? "var(--color-error)"
        : "var(--color-text-faint)";

  return (
    <div
      className="card"
      style={{
        borderColor: isExpanded
          ? "var(--color-border)"
          : "var(--color-border-subtle)",
        transition: "border-color 0.15s",
      }}
    >
      {/* Row */}
      <button
        onClick={onExpand}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "0.875rem 1.25rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.875rem",
        }}
      >
        {/* Status */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: statusColor,
            flexShrink: 0,
            animation:
              execution.status === "pending" ? "pulse 1s infinite" : undefined,
          }}
        />

        {/* Input */}
        <span
          style={{
            fontSize: "0.875rem",
            color: "var(--color-text)",
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {execution.input}
        </span>

        {/* Workflow */}
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-muted)",
            flexShrink: 0,
            display: "none",
          }}
          className="sm-show"
        >
          {execution.workflow_name}
        </span>

        {/* File */}
        {execution.file_name && (
          <span
            style={{
              fontSize: "0.6875rem",
              color: "var(--color-text-faint)",
              flexShrink: 0,
            }}
          >
            📎
          </span>
        )}

        {/* Duration */}
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-faint)",
            flexShrink: 0,
          }}
        >
          {formatDuration(duration)}
        </span>

        {/* Time ago */}
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-faint)",
            flexShrink: 0,
          }}
        >
          {formatTimeAgo(execution.created_at)}
        </span>

        {/* Chevron */}
        <span
          style={{
            fontSize: "0.6875rem",
            color: "var(--color-text-faint)",
            flexShrink: 0,
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
          }}
        >
          ▼
        </span>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div
          style={{
            borderTop: "1px solid var(--color-border-subtle)",
            padding: "1rem 1.25rem",
            background: "rgba(0,0,0,0.2)",
          }}
        >
          {/* Metadata */}
          <div
            style={{
              display: "flex",
              gap: "1.5rem",
              flexWrap: "wrap",
              marginBottom: "1rem",
            }}
          >
            <MetaItem label="Intent" value={execution.intent_key} />
            <MetaItem label="Status">
              <span
                className={
                  execution.status === "success"
                    ? "badge badge-success"
                    : execution.status === "failed"
                      ? "badge badge-error"
                      : "badge badge-pending"
                }
              >
                {execution.status}
              </span>
            </MetaItem>
            <MetaItem label="ID" value={execution.id.slice(0, 8) + "..."} />
            {duration !== null && (
              <MetaItem label="Duration" value={formatDuration(duration)} />
            )}
          </div>

          {/* File */}
          {execution.file_name && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.375rem 0.75rem",
                background: "var(--color-surface-2)",
                borderRadius: 6,
                marginBottom: "1rem",
              }}
            >
              <span style={{ fontSize: "0.75rem" }}>📎</span>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-text-muted)",
                }}
              >
                {execution.file_name}
              </span>
              {execution.file_type && (
                <span
                  style={{
                    fontSize: "0.6875rem",
                    color: "var(--color-text-faint)",
                  }}
                >
                  · {execution.file_type.split("/").pop()}
                </span>
              )}
            </div>
          )}

          {/* Detail loading */}
          {detailState.phase === "loading" && (
            <p
              style={{ fontSize: "0.75rem", color: "var(--color-text-faint)" }}
            >
              Loading detail...
            </p>
          )}

          {/* Detail content */}
          {detailState.phase === "success" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {detailState.data.result && (
                <div>
                  <p
                    style={{
                      fontSize: "0.6875rem",
                      color: "var(--color-text-faint)",
                      marginBottom: "0.375rem",
                    }}
                  >
                    Result
                  </p>
                  <pre
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--color-text-muted)",
                      background: "var(--color-bg)",
                      borderRadius: 6,
                      padding: "0.75rem",
                      overflow: "auto",
                      maxHeight: 200,
                    }}
                  >
                    {JSON.stringify(detailState.data.result, null, 2)}
                  </pre>
                </div>
              )}
              {detailState.data.error && (
                <div>
                  <p
                    style={{
                      fontSize: "0.6875rem",
                      color: "var(--color-text-faint)",
                      marginBottom: "0.375rem",
                    }}
                  >
                    Error
                  </p>
                  <p style={{ fontSize: "0.8125rem", color: "#fca5a5" }}>
                    {detailState.data.error}
                  </p>
                </div>
              )}
              {detailState.data.file_url && (
                <div>
                  <p
                    style={{
                      fontSize: "0.6875rem",
                      color: "var(--color-text-faint)",
                      marginBottom: "0.375rem",
                    }}
                  >
                    File URL
                  </p>
                  <a
                    href={detailState.data.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--color-text-muted)",
                      wordBreak: "break-all",
                    }}
                  >
                    {detailState.data.file_url}
                  </a>
                </div>
              )}
            </div>
          )}

          {detailState.phase === "error" && (
            <p style={{ fontSize: "0.75rem", color: "var(--color-error)" }}>
              {detailState.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetaItem
// ---------------------------------------------------------------------------

function MetaItem({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p
        style={{
          fontSize: "0.6875rem",
          color: "var(--color-text-faint)",
          marginBottom: 2,
        }}
      >
        {label}
      </p>
      {children ?? (
        <p
          style={{
            fontSize: "0.8125rem",
            fontWeight: 500,
            color: "var(--color-text-muted)",
          }}
        >
          {value}
        </p>
      )}
    </div>
  );
}
