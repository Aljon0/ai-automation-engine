"use client";

/**
 * app/page.tsx
 *
 * Phase 10 — Redesigned Task Form
 * Professional UI with Inter font and design system classes.
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
    label: "Running",
    description: "Automation engine executing",
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
) {
  if (isFailed && step === currentStep) return "failed";
  const curr = STEP_ORDER.indexOf(currentStep);
  const idx = STEP_ORDER.indexOf(step);
  if (idx < curr) return "done";
  if (idx === curr) return "active";
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
      const taskPromise = submitTask(input.trim(), attachedFile);
      setSubmitState({ phase: "streaming", executionId: "", step: "idle" });
      const taskResult = await taskPromise;
      const executionId = taskResult.execution_id;

      setSubmitState({
        phase: "streaming",
        executionId,
        step: "idle",
        workflowName: taskResult.workflow_name,
      });

      const cleanup = streamExecution(executionId, {
        onIntent: () =>
          setSubmitState((p) =>
            p.phase === "streaming" ? { ...p, step: "intent_detected" } : p,
          ),
        onWorkflowSelected: () =>
          setSubmitState((p) =>
            p.phase === "streaming" ? { ...p, step: "workflow_selected" } : p,
          ),
        onN8nTriggered: () =>
          setSubmitState((p) =>
            p.phase === "streaming" ? { ...p, step: "n8n_triggered" } : p,
          ),
        onCompleted: () =>
          setSubmitState({ phase: "success", data: taskResult }),
        onFailed: () => setSubmitState({ phase: "success", data: taskResult }),
        onError: () => setSubmitState({ phase: "success", data: taskResult }),
      });
      streamCleanupRef.current = cleanup;
    } catch (err) {
      setSubmitState({
        phase: "error",
        message: err instanceof Error ? err.message : "Unknown error",
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
    setInput(INTENT_PROMPTS[workflow.intent_key] ?? workflow.workflow_name);
    setSubmitState({ phase: "idle" });
  }

  const isSubmitting = submitState.phase === "streaming";
  const isUploading = uploadState.phase === "uploading";

  return (
    <div className="page-container-narrow">
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            marginBottom: "0.5rem",
          }}
        >
          Automate a Task
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
          Describe what you want to do in plain language.
        </p>
      </div>

      {/* Task Form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: "1.5rem" }}>
        <div
          className="card"
          style={{
            borderColor: isSubmitting ? "var(--color-border)" : undefined,
            transition: "border-color 0.15s",
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Analyze my CSV file, Summarize this document, Send an email..."
            rows={4}
            disabled={isSubmitting}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              padding: "1rem 1.25rem",
              fontSize: "0.9375rem",
              color: "var(--color-text)",
              fontFamily: "inherit",
              resize: "none",
              lineHeight: 1.6,
              opacity: isSubmitting ? 0.5 : 1,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                handleSubmit(e as unknown as React.FormEvent);
            }}
          />

          <div
            style={{
              padding: "0.75rem 1.25rem",
              borderTop: "1px solid var(--color-border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            {/* File upload trigger */}
            <FileUpload
              uploadState={uploadState}
              onFileSelect={handleFileSelect}
              onClear={() => setUploadState({ phase: "idle" })}
              disabled={isSubmitting}
              inline
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: "0.6875rem",
                  color: "var(--color-text-faint)",
                }}
              >
                ⌘ Enter
              </span>
              <button
                type="submit"
                disabled={isSubmitting || isUploading || !input.trim()}
                className="btn-primary"
              >
                {isSubmitting ? "Running..." : "Run Workflow"}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Pipeline */}
      {submitState.phase === "streaming" && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="card-header">
            <span className="section-label">Executing</span>
            {submitState.workflowName && (
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-text-muted)",
                }}
              >
                {submitState.workflowName}
              </span>
            )}
          </div>
          <div
            style={{
              padding: "1rem 1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {PIPELINE_STEPS.map((pStep) => {
              const state = getStepState(pStep.key, submitState.step, false);
              return (
                <div
                  key={pStep.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.875rem",
                  }}
                >
                  <StepIndicator state={state} />
                  <div>
                    <p
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: 500,
                        color:
                          state === "done"
                            ? "var(--color-success)"
                            : state === "active"
                              ? "var(--color-text)"
                              : "var(--color-text-faint)",
                      }}
                    >
                      {pStep.label}
                    </p>
                    <p
                      style={{
                        fontSize: "0.6875rem",
                        color: "var(--color-text-faint)",
                      }}
                    >
                      {pStep.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Result */}
      {submitState.phase === "success" && (
        <ResultCard data={submitState.data} onReset={handleReset} />
      )}

      {/* Error */}
      {submitState.phase === "error" && (
        <div
          className="card"
          style={{ borderColor: "var(--color-error)", marginBottom: "1.5rem" }}
        >
          <div style={{ padding: "1rem 1.25rem" }}>
            <p
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--color-error)",
                marginBottom: "0.25rem",
              }}
            >
              Request Failed
            </p>
            <p style={{ fontSize: "0.8125rem", color: "#fca5a5" }}>
              {submitState.message}
            </p>
            <button
              onClick={handleReset}
              style={{
                marginTop: "0.75rem",
                fontSize: "0.75rem",
                color: "var(--color-text-muted)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Try again →
            </button>
          </div>
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
  );
}

// ---------------------------------------------------------------------------
// StepIndicator
// ---------------------------------------------------------------------------

function StepIndicator({
  state,
}: {
  state: "done" | "active" | "pending" | "failed";
}) {
  const base: React.CSSProperties = {
    width: 20,
    height: 20,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontSize: "0.6875rem",
    fontWeight: 700,
  };

  if (state === "done")
    return (
      <div
        style={{ ...base, background: "var(--color-success)", color: "#fff" }}
      >
        ✓
      </div>
    );
  if (state === "active")
    return (
      <div
        style={{
          ...base,
          background: "var(--color-surface-2)",
          border: "2px solid var(--color-border)",
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--color-text)",
            animation: "pulse 1s infinite",
          }}
        />
      </div>
    );
  if (state === "failed")
    return (
      <div
        style={{
          ...base,
          background: "var(--color-error-bg)",
          border: "1px solid var(--color-error)",
          color: "var(--color-error)",
        }}
      >
        ✕
      </div>
    );
  return (
    <div style={{ ...base, border: "1px solid var(--color-border-subtle)" }} />
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
  inline?: boolean;
}

function FileUpload({
  uploadState,
  onFileSelect,
  onClear,
  disabled,
  inline,
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

  if (uploadState.phase === "done") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--color-success)",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {uploadState.file.file_name}
        </span>
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          style={{
            fontSize: "0.6875rem",
            color: "var(--color-text-faint)",
            background: "none",
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
            padding: 0,
          }}
        >
          ✕
        </button>
      </div>
    );
  }

  if (uploadState.phase === "uploading") {
    return (
      <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
        Uploading...
      </span>
    );
  }

  if (inline) {
    return (
      <>
        <button
          type="button"
          onClick={() => !disabled && inputRef.current?.click()}
          disabled={disabled}
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-subtle)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
          }}
        >
          <span style={{ fontSize: "1rem" }}>📎</span>
          Attach file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS}
          onChange={handleChange}
          style={{ display: "none" }}
        />
      </>
    );
  }

  return (
    <div>
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `1px dashed ${isDragging ? "var(--color-border)" : "var(--color-border-subtle)"}`,
          borderRadius: 8,
          padding: "1rem",
          textAlign: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          background: isDragging ? "var(--color-surface)" : "transparent",
          opacity: disabled ? 0.4 : 1,
          transition: "all 0.15s",
        }}
      >
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
          Drop a file or{" "}
          <span
            style={{ color: "var(--color-text)", textDecoration: "underline" }}
          >
            browse
          </span>
        </p>
        <p
          style={{
            fontSize: "0.6875rem",
            color: "var(--color-text-faint)",
            marginTop: 4,
          }}
        >
          CSV · PDF · DOCX — max 10MB
        </p>
      </div>
      {uploadState.phase === "error" && (
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--color-error)",
            marginTop: "0.5rem",
          }}
        >
          {uploadState.message}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS}
        onChange={handleChange}
        style={{ display: "none" }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkflowRegistry
// ---------------------------------------------------------------------------

function WorkflowRegistry({
  state,
  onSelect,
}: {
  state: WorkflowsState;
  onSelect: (w: WorkflowSummary) => void;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <span className="section-label">Available Workflows</span>
        {state.phase === "success" && (
          <span
            style={{ fontSize: "0.6875rem", color: "var(--color-text-faint)" }}
          >
            {state.workflows.length} active
          </span>
        )}
      </div>

      {state.phase === "loading" && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 64,
                borderRadius: 8,
                background: "var(--color-surface)",
                animation: "pulse 1.5s infinite",
              }}
            />
          ))}
        </div>
      )}

      {state.phase === "error" && (
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-faint)" }}>
          Could not load workflows.
        </p>
      )}

      {state.phase === "success" && state.workflows.length === 0 && (
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-faint)" }}>
          No active workflows found.
        </p>
      )}

      {state.phase === "success" && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {state.workflows.map((wf) => (
            <button
              key={wf.id}
              onClick={() => onSelect(wf)}
              style={{
                width: "100%",
                textAlign: "left",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border-subtle)",
                borderRadius: 8,
                padding: "0.875rem 1rem",
                cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "var(--color-border)";
                (e.currentTarget as HTMLButtonElement).style.background =
                  "var(--color-surface-2)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "var(--color-border-subtle)";
                (e.currentTarget as HTMLButtonElement).style.background =
                  "var(--color-surface)";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "1rem",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "var(--color-text)",
                      marginBottom: 2,
                    }}
                  >
                    {wf.workflow_name}
                  </p>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--color-text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {wf.description}
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    flexShrink: 0,
                  }}
                >
                  <code
                    style={{
                      fontSize: "0.6875rem",
                      color: "var(--color-text-faint)",
                      background: "var(--color-bg)",
                      padding: "0.125rem 0.375rem",
                      borderRadius: 4,
                    }}
                  >
                    {wf.intent_key}
                  </code>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--color-success)",
                    }}
                  />
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
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      className="card"
      style={{
        marginBottom: "1.5rem",
        borderColor: isSuccess
          ? "var(--color-border-subtle)"
          : "var(--color-error)",
      }}
    >
      {/* Header */}
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: isSuccess
                ? "var(--color-success)"
                : "var(--color-error)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--color-text)",
            }}
          >
            {data.workflow_name}
          </span>
          <span
            className={isSuccess ? "badge badge-success" : "badge badge-error"}
          >
            {data.status}
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-faint)",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {/* Meta */}
      <div
        style={{
          padding: "0.75rem 1.25rem",
          borderBottom: "1px solid var(--color-border-subtle)",
          display: "flex",
          gap: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <MetaItem label="Intent" value={data.intent_key} />
        <MetaItem
          label="Execution ID"
          value={data.execution_id.slice(0, 8) + "..."}
        />
        {data.file_name && <MetaItem label="File" value={data.file_name} />}
      </div>

      {/* Result body */}
      {expanded && (
        <div style={{ padding: "1rem 1.25rem" }}>
          {isSuccess && data.result ? (
            <ResultDisplay result={data.result} />
          ) : (
            <div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-text-faint)",
                  marginBottom: "0.5rem",
                }}
              >
                Error
              </p>
              <p style={{ fontSize: "0.875rem", color: "#fca5a5" }}>
                {data.error}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          padding: "0.625rem 1.25rem",
          borderTop: "1px solid var(--color-border-subtle)",
        }}
      >
        <button
          onClick={onReset}
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-faint)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          ← Run another task
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ResultDisplay — smart result renderer
// ---------------------------------------------------------------------------

function ResultDisplay({ result }: { result: Record<string, unknown> }) {
  // Check for known result shapes
  const analysis = result.analysis as string | undefined;
  const summary = result.summary as string | undefined;
  const message = result.message as string | undefined;
  const sent = result.sent as boolean | undefined;

  // Email result
  if (sent !== undefined) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.25rem" }}>✉️</span>
          <span
            style={{
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--color-success)",
            }}
          >
            Email sent successfully
          </span>
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <MetaItem label="To" value={String(result.to ?? "")} />
          <MetaItem label="Subject" value={String(result.subject ?? "")} />
        </div>

        {Boolean(result.body) && (
          <div>
            <p
              style={{
                fontSize: "0.6875rem",
                color: "var(--color-text-faint)",
                marginBottom: "0.375rem",
              }}
            >
              Body
            </p>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--color-text-muted)",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {String(result.body)}
            </p>
          </div>
        )}
      </div>
    );
  }

  // AI text result (analysis or summary)
  const textContent = analysis ?? summary ?? message;
  if (textContent) {
    return (
      <div>
        <p
          style={{
            fontSize: "0.6875rem",
            color: "var(--color-text-faint)",
            marginBottom: "0.5rem",
          }}
        >
          Result
        </p>
        <div
          style={{
            fontSize: "0.875rem",
            color: "var(--color-text-muted)",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            maxHeight: 400,
            overflowY: "auto",
          }}
        >
          {textContent
            .replace(/\*\*(.*?)\*\*/g, "$1") // strip markdown bold
            .replace(/\n\n/g, "\n")}
        </div>

        {Boolean(result.row_count) && (
          <div style={{ marginTop: "0.75rem", display: "flex", gap: "1rem" }}>
            <MetaItem label="Rows" value={String(result.row_count)} />
            {Boolean(result.col_count) && (
              <MetaItem label="Columns" value={String(result.col_count)} />
            )}
          </div>
        )}
      </div>
    );
  }

  // Raw JSON fallback
  return (
    <div>
      <p
        style={{
          fontSize: "0.6875rem",
          color: "var(--color-text-faint)",
          marginBottom: "0.5rem",
        }}
      >
        Raw Result
      </p>
      <pre
        style={{
          fontSize: "0.75rem",
          color: "var(--color-text-muted)",
          background: "var(--color-bg)",
          borderRadius: 6,
          padding: "0.75rem",
          overflow: "auto",
          maxHeight: 300,
        }}
      >
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetaItem
// ---------------------------------------------------------------------------

function MetaItem({ label, value }: { label: string; value: string }) {
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
      <p
        style={{
          fontSize: "0.8125rem",
          fontWeight: 500,
          color: "var(--color-text-muted)",
        }}
      >
        {value}
      </p>
    </div>
  );
}
