"use client";

/**
 * app/page.tsx
 *
 * Phase 1 — Walking Skeleton UI
 *
 * Two concerns on one page (acceptable for Phase 1):
 * 1. TaskForm   — user submits a natural language task
 * 2. ResultCard — displays the workflow execution result
 */

import { useState } from "react";
import { submitTask, TaskResponse } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SubmitState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "success"; data: TaskResponse }
  | { phase: "error"; message: string };

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const [input, setInput] = useState("");
  const [state, setState] = useState<SubmitState>({ phase: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    setState({ phase: "loading" });

    try {
      const data = await submitTask(input.trim());
      setState({ phase: "success", data });
    } catch (err) {
      setState({
        phase: "error",
        message: err instanceof Error ? err.message : "Unknown error occurred.",
      });
    }
  }

  function handleReset() {
    setInput("");
    setState({ phase: "idle" });
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 font-mono flex flex-col items-center justify-center px-4">

      {/* Header */}
      <div className="mb-10 text-center">
        <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
          AI Workflow Automation Engine
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Automate a Task
        </h1>
        <p className="text-sm text-zinc-500 mt-2">
          Describe what you want to do in plain language.
        </p>
      </div>

      <div className="w-full max-w-lg space-y-4">

        {/* Task Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="border border-zinc-800 rounded-lg overflow-hidden focus-within:border-zinc-600 transition-colors">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Analyze my CSV, Summarize this document, Send an email..."
              rows={3}
              disabled={state.phase === "loading"}
              className="w-full bg-transparent px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }}
            />
            <div className="px-4 py-2 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-600">
                Cmd + Enter to submit
              </span>
              <button
                type="submit"
                disabled={state.phase === "loading" || !input.trim()}
                className="text-xs px-3 py-1.5 rounded-md bg-zinc-100 text-zinc-900 font-medium
                           hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed
                           transition-colors"
              >
                {state.phase === "loading" ? "Running..." : "Run Workflow"}
              </button>
            </div>
          </div>
        </form>

        {/* Hint chips */}
        {state.phase === "idle" && (
          <div className="flex flex-wrap gap-2">
            {[
              "hello",
              "Analyze my CSV",
              "Summarize this document",
              "Send an email",
              "Generate a report",
            ].map((hint) => (
              <button
                key={hint}
                onClick={() => setInput(hint)}
                className="text-xs px-3 py-1 rounded-full border border-zinc-800
                           text-zinc-500 hover:text-zinc-300 hover:border-zinc-600
                           transition-colors"
              >
                {hint}
              </button>
            ))}
          </div>
        )}

        {/* Result Card */}
        {state.phase === "success" && (
          <ResultCard data={state.data} onReset={handleReset} />
        )}

        {/* Error state */}
        {state.phase === "error" && (
          <div className="border border-red-800 rounded-lg bg-red-950/40 px-4 py-3 space-y-2">
            <p className="text-xs font-medium text-red-400">Request Failed</p>
            <p className="text-xs text-red-300">{state.message}</p>
            <button
              onClick={handleReset}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading state */}
        {state.phase === "loading" && (
          <div className="border border-zinc-800 rounded-lg px-4 py-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse" />
              <span className="text-xs text-zinc-400">Detecting intent...</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-zinc-700 animate-pulse" />
              <span className="text-xs text-zinc-600">Selecting workflow...</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-zinc-700 animate-pulse" />
              <span className="text-xs text-zinc-600">Triggering n8n...</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// ResultCard
// ---------------------------------------------------------------------------

interface ResultCardProps {
  data: TaskResponse;
  onReset: () => void;
}

function ResultCard({ data, onReset }: ResultCardProps) {
  const isSuccess = data.status === "success";

  return (
    <div className={`border rounded-lg overflow-hidden ${
      isSuccess ? "border-zinc-700" : "border-red-800"
    }`}>

      {/* Card header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
        isSuccess ? "border-zinc-800 bg-zinc-900/60" : "border-red-900 bg-red-950/40"
      }`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            isSuccess ? "bg-emerald-400" : "bg-red-500"
          }`} />
          <span className="text-xs font-medium text-zinc-200">
            {data.workflow_name}
          </span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${
          isSuccess
            ? "bg-emerald-950 text-emerald-400 border-emerald-800"
            : "bg-red-950 text-red-400 border-red-800"
        }`}>
          {data.status}
        </span>
      </div>

      {/* Metadata row */}
      <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center gap-4">
        <MetaItem label="Intent" value={data.intent_key} />
        <MetaItem label="Execution ID" value={data.execution_id.slice(0, 8) + "..."} />
      </div>

      {/* Result / Error body */}
      <div className="px-4 py-3">
        {isSuccess && data.result ? (
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 mb-2">Result</p>
            <pre className="text-xs text-zinc-300 bg-zinc-900 rounded-md p-3 overflow-x-auto">
              {JSON.stringify(data.result, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 mb-1">Error</p>
            <p className="text-xs text-red-300">{data.error}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-zinc-800/60">
        <button
          onClick={onReset}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Run another task
        </button>
      </div>
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