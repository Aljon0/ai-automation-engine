"use client";

/**
 * app/page.tsx
 *
 * Phase 7 update — Live Updates via SSE
 *
 * Changes:
 * - Loading state replaced with live pipeline visualization
 * - Each step lights up as SSE events arrive
 * - submitTask now opens SSE stream immediately after getting execution_id
 */

import {
  fetchWorkflows,
  streamExecution,
  submitTask,
  TaskResponse,
  uploadFile,
  UploadResponse,
  WorkflowSummary,
} from "@/lib/api";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PipelineStep =
  | "idle"
  | "intent_detected"
  | "workflow_selected"
  | "n8n_triggered"
  | "completed"
  | "failed";

type UploadState =
  | { phase: "idle" }
  | { phase: "uploading" }
  | { phase: "done"; file: UploadResponse }
  | { phase: "error"; message: string };

type SubmitState =
  | { phase: "idle" }
  | {
      phase: "streaming";
      executionId: string;
      step: PipelineStep;
      workflowName?: string;
    }
  | { phase: "success"; data: TaskResponse }
  | { phase: "error"; message: string };

type WorkflowsState =
  | { phase: "loading" }
  | { phase: "success"; workflows: WorkflowSummary[] }
  | { phase: "error" };

const INTENT_PROMPTS: Record<string, string> = {
  hello_world: "hello",
  csv_analysis: "Analyze my CSV file",
  document_processing: "Summarize this document",
  email_automation: "Send an email to my team",
  data_extraction: "Extract data from this page",
  report_generation: "Generate a weekly report",
};

const ALLOWED_EXTENSIONS = ".csv,.pdf,.doc,.docx";
const ALLOWED_TYPES = [
  "text/csv",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

// ---------------------------------------------------------------------------
// Pipeline steps config
// ---------------------------------------------------------------------------

const PIPELINE_STEPS: {
  key: PipelineStep;
  label: string;
  description: string;
}[] = [
  {
    key: "intent_detected",
    label: "Intent Detected",
    description: "AI classified your request",
  },
  {
    key: "workflow_selected",
    label: "Workflow Selected",
    description: "Matched to automation",
  },
  {
    key: "n8n_triggered",
    label: "n8n Triggered",
    description: "Automation engine running",
  },
  { key: "completed", label: "Completed", description: "Result ready" },
];

const STEP_ORDER: PipelineStep[] = [
  "intent_detected",
  "workflow_selected",
  "n8n_triggered",
  "completed",
];

function getStepState(
  step: PipelineStep,
  currentStep: PipelineStep,
  isFailed: boolean,
): "done" | "active" | "pending" | "failed" {
  if (isFailed && step === currentStep) return "failed";
  const currentIdx = STEP_ORDER.indexOf(currentStep);
  const stepIdx = STEP_ORDER.indexOf(step);
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const [input, setInput] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({
    phase: "idle",
  });
  const [uploadState, setUploadState] = useState<UploadState>({
    phase: "idle",
  });
  const [workflowsState, setWorkflowsState] = useState<WorkflowsState>({
    phase: "loading",
  });
  const streamCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetchWorkflows()
      .then(({ workflows }) =>
        setWorkflowsState({ phase: "success", workflows }),
      )
      .catch(() => setWorkflowsState({ phase: "error" }));
  }, []);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      streamCleanupRef.current?.();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      const attachedFile =
        uploadState.phase === "done" ? uploadState.file : undefined;

      // Submit task — get execution_id immediately
      const taskPromise = submitTask(input.trim(), attachedFile);

      // Start streaming while task executes
      setSubmitState({ phase: "streaming", executionId: "", step: "idle" });

      const taskResult = await taskPromise;
      const executionId = taskResult.execution_id;

      // Update state with execution ID
      setSubmitState({
        phase: "streaming",
        executionId,
        step: "idle",
        workflowName: taskResult.workflow_name,
      });

      // Open SSE stream
      const cleanup = streamExecution(executionId, {
        onIntent: () => {
          setSubmitState((prev) =>
            prev.phase === "streaming"
              ? { ...prev, step: "intent_detected" }
              : prev,
          );
        },
        onWorkflowSelected: () => {
          setSubmitState((prev) =>
            prev.phase === "streaming"
              ? { ...prev, step: "workflow_selected" }
              : prev,
          );
        },
        onN8nTriggered: () => {
          setSubmitState((prev) =>
            prev.phase === "streaming"
              ? { ...prev, step: "n8n_triggered" }
              : prev,
          );
        },
        onCompleted: () => {
          setSubmitState({ phase: "success", data: taskResult });
        },
        onFailed: () => {
          setSubmitState({ phase: "success", data: taskResult });
        },
        onError: () => {
          setSubmitState({ phase: "success", data: taskResult });
        },
      });

      streamCleanupRef.current = cleanup;
    } catch (err) {
      setSubmitState({
        phase: "error",
        message: err instanceof Error ? err.message : "Unknown error occurred.",
      });
    }
  }

  async function handleFileSelect(file: File) {
    setUploadState({ phase: "uploading" });
    try {
      const uploaded = await uploadFile(file);
      setUploadState({ phase: "done", file: uploaded });
    } catch (err) {
      setUploadState({
        phase: "error",
        message: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }

  function handleReset() {
    streamCleanupRef.current?.();
    streamCleanupRef.current = null;
    setInput("");
    setSubmitState({ phase: "idle" });
    setUploadState({ phase: "idle" });
  }

  function handleWorkflowClick(workflow: WorkflowSummary) {
    const prompt =
      INTENT_PROMPTS[workflow.intent_key] ?? workflow.workflow_name;
    setInput(prompt);
    setSubmitState({ phase: "idle" });
  }

  const isSubmitting = submitState.phase === "streaming";
  const isUploading = uploadState.phase === "uploading";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 font-mono flex flex-col items-center justify-center px-4 py-16">
      {/* Header */}
      <div className="mb-10 text-center relative">
        <Link
          href="/runs"
          className="absolute right-0 top-0 text-xs text-zinc-500 hover:text-zinc-300 transition-colors border border-zinc-800 rounded-md px-3 py-1.5"
        >
          View Runs
        </Link>
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
              disabled={isSubmitting}
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
                disabled={isSubmitting || isUploading || !input.trim()}
                className="text-xs px-3 py-1.5 rounded-md bg-zinc-100 text-zinc-900 font-medium
                           hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Running..." : "Run Workflow"}
              </button>
            </div>
          </div>

          {/* File Upload */}
          <FileUpload
            uploadState={uploadState}
            onFileSelect={handleFileSelect}
            onClear={() => setUploadState({ phase: "idle" })}
            disabled={isSubmitting}
          />
        </form>

        {/* Live Pipeline */}
        {submitState.phase === "streaming" && (
          <LivePipeline
            step={submitState.step}
            workflowName={submitState.workflowName}
            failed={false}
          />
        )}

        {/* Result Card */}
        {submitState.phase === "success" && (
          <ResultCard data={submitState.data} onReset={handleReset} />
        )}

        {/* Error */}
        {submitState.phase === "error" && (
          <div className="border border-red-800 rounded-lg bg-red-950/40 px-4 py-3 space-y-2">
            <p className="text-xs font-medium text-red-400">Request Failed</p>
            <p className="text-xs text-red-300">{submitState.message}</p>
            <button
              onClick={handleReset}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Available Workflows */}
        {submitState.phase !== "streaming" && (
          <WorkflowRegistry
            state={workflowsState}
            onSelect={handleWorkflowClick}
          />
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// LivePipeline
// ---------------------------------------------------------------------------

function LivePipeline({
  step,
  workflowName,
  failed,
}: {
  step: PipelineStep;
  workflowName?: string;
  failed: boolean;
}) {
  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-xs text-zinc-500 tracking-widest uppercase">
          Running
        </span>
        {workflowName && (
          <span className="text-xs text-zinc-400">{workflowName}</span>
        )}
      </div>
      <div className="px-4 py-4 space-y-3">
        {PIPELINE_STEPS.map((pStep, idx) => {
          const state = getStepState(pStep.key, step, failed);
          return (
            <div key={pStep.key} className="flex items-center gap-3">
              {/* Step indicator */}
              <div className="shrink-0 w-5 h-5 rounded-full border flex items-center justify-center">
                {state === "done" && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center border-0">
                    <span className="text-[9px] text-white font-bold">✓</span>
                  </div>
                )}
                {state === "active" && (
                  <div className="w-5 h-5 rounded-full bg-zinc-700 border border-zinc-500 flex items-center justify-center animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-zinc-300" />
                  </div>
                )}
                {state === "failed" && (
                  <div className="w-5 h-5 rounded-full bg-red-900 border border-red-700 flex items-center justify-center">
                    <span className="text-[9px] text-red-400 font-bold">✕</span>
                  </div>
                )}
                {state === "pending" && (
                  <div className="w-5 h-5 rounded-full border border-zinc-700" />
                )}
              </div>

              {/* Step text */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs font-medium ${
                    state === "done"
                      ? "text-emerald-400"
                      : state === "active"
                        ? "text-zinc-200"
                        : state === "failed"
                          ? "text-red-400"
                          : "text-zinc-600"
                  }`}
                >
                  {pStep.label}
                </p>
                <p className="text-xs text-zinc-600">{pStep.description}</p>
              </div>

              {/* Connector line */}
              {idx < PIPELINE_STEPS.length - 1 && (
                <div className="absolute left-9 mt-8 w-px h-3 bg-zinc-800" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FileUpload
// ---------------------------------------------------------------------------

interface FileUploadProps {
  uploadState: UploadState;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  disabled: boolean;
}

function FileUpload({
  uploadState,
  onFileSelect,
  onClear,
  disabled,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file && ALLOWED_TYPES.includes(file.type)) onFileSelect(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = "";
  }

  if (uploadState.phase === "idle" || uploadState.phase === "error") {
    return (
      <div className="space-y-1.5">
        <div
          onClick={() => !disabled && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border border-dashed rounded-lg px-4 py-4 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-zinc-500 bg-zinc-900/60"
              : "border-zinc-800 hover:border-zinc-600"
          } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          <p className="text-xs text-zinc-500">
            Attach a file{" "}
            <span className="text-zinc-400 underline underline-offset-2">
              browse
            </span>
          </p>
          <p className="text-xs text-zinc-700 mt-1">
            CSV · PDF · DOCX — max 10MB
          </p>
        </div>
        {uploadState.phase === "error" && (
          <p className="text-xs text-red-400 px-1">{uploadState.message}</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS}
          onChange={handleChange}
          className="hidden"
        />
      </div>
    );
  }

  if (uploadState.phase === "uploading") {
    return (
      <div className="border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse shrink-0" />
        <span className="text-xs text-zinc-500">Uploading file...</span>
      </div>
    );
  }

  return (
    <div className="border border-zinc-700 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-zinc-300 truncate">
            {uploadState.file.file_name}
          </p>
          <p className="text-xs text-zinc-600">
            {(uploadState.file.file_size / 1024).toFixed(1)}KB · ready
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClear}
        disabled={disabled}
        className="text-xs text-zinc-600 hover:text-zinc-400 shrink-0 transition-colors disabled:opacity-30"
      >
        Remove
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkflowRegistry + WorkflowCard
// ---------------------------------------------------------------------------

function WorkflowRegistry({
  state,
  onSelect,
}: {
  state: WorkflowsState;
  onSelect: (w: WorkflowSummary) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs tracking-widest text-zinc-600 uppercase">
          Available Workflows
        </p>
        {state.phase === "success" && (
          <span className="text-xs text-zinc-600">
            {state.workflows.length} active
          </span>
        )}
      </div>
      {state.phase === "loading" && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-16 rounded-lg border border-zinc-800 bg-zinc-900/40 animate-pulse"
            />
          ))}
        </div>
      )}
      {state.phase === "error" && (
        <p className="text-xs text-zinc-600 py-2">
          Could not load workflows — is the backend running?
        </p>
      )}
      {state.phase === "success" && state.workflows.length === 0 && (
        <p className="text-xs text-zinc-600 py-2">No active workflows found.</p>
      )}
      {state.phase === "success" && state.workflows.length > 0 && (
        <div className="space-y-2">
          {state.workflows.map((workflow) => (
            <button
              key={workflow.id}
              onClick={() => onSelect(workflow)}
              className="w-full text-left border border-zinc-800 rounded-lg px-4 py-3 hover:border-zinc-600 hover:bg-zinc-900/60 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
                    {workflow.workflow_name}
                  </p>
                  <p className="text-xs text-zinc-600 truncate">
                    {workflow.description}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-xs text-zinc-600 font-mono">
                    {workflow.intent_key}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ResultCard
// ---------------------------------------------------------------------------

function ResultCard({
  data,
  onReset,
}: {
  data: TaskResponse;
  onReset: () => void;
}) {
  const isSuccess = data.status === "success";
  return (
    <div
      className={`border rounded-lg overflow-hidden ${isSuccess ? "border-zinc-700" : "border-red-800"}`}
    >
      <div
        className={`px-4 py-3 border-b flex items-center justify-between ${
          isSuccess
            ? "border-zinc-800 bg-zinc-900/60"
            : "border-red-900 bg-red-950/40"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${isSuccess ? "bg-emerald-400" : "bg-red-500"}`}
          />
          <span className="text-xs font-medium text-zinc-200">
            {data.workflow_name}
          </span>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full border ${
            isSuccess
              ? "bg-emerald-950 text-emerald-400 border-emerald-800"
              : "bg-red-950 text-red-400 border-red-800"
          }`}
        >
          {data.status}
        </span>
      </div>
      <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center gap-4 flex-wrap">
        <MetaItem label="Intent" value={data.intent_key} />
        <MetaItem
          label="Execution ID"
          value={data.execution_id.slice(0, 8) + "..."}
        />
        {data.file_name && <MetaItem label="File" value={data.file_name} />}
      </div>
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
