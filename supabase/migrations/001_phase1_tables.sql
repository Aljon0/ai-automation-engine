-- =============================================================================
-- Phase 1 Migration: Walking Skeleton Tables
-- =============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- Or via Supabase CLI: supabase db push
-- =============================================================================

-- ---------------------------------------------------------------------------
-- workflow_registry
-- Static list of available workflows the system can trigger.
-- Seeded manually — one row per n8n workflow.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workflow_registry (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_name TEXT        NOT NULL,
  description   TEXT        NOT NULL,
  webhook_url   TEXT        NOT NULL,
  intent_key    TEXT        NOT NULL UNIQUE,  -- matches IntentService output e.g. "csv_analysis"
  status        TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE workflow_registry IS
  'Registry of all available n8n workflows. One row per workflow.';

COMMENT ON COLUMN workflow_registry.intent_key IS
  'Unique key matched against IntentService output. e.g. csv_analysis, document_processing';

COMMENT ON COLUMN workflow_registry.webhook_url IS
  'Full n8n webhook URL to POST to when this workflow is triggered.';

-- ---------------------------------------------------------------------------
-- workflow_executions
-- Log of every workflow run — one row per task submission.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workflow_executions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id   UUID        NOT NULL REFERENCES workflow_registry(id),
  input         TEXT        NOT NULL,               -- raw user input string
  status        TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'success', 'failed')),
  result        JSONB,                              -- n8n response payload
  error         TEXT,                              -- error message if failed
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ                        -- set when status changes from pending
);

COMMENT ON TABLE workflow_executions IS
  'Execution log for every workflow run triggered by a user task submission.';

COMMENT ON COLUMN workflow_executions.input IS
  'The raw natural language input submitted by the user.';

COMMENT ON COLUMN workflow_executions.result IS
  'The raw JSON response returned by n8n on success.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Most common query: "show me recent executions"
CREATE INDEX IF NOT EXISTS idx_executions_created_at
  ON workflow_executions (created_at DESC);

-- Lookup executions by workflow
CREATE INDEX IF NOT EXISTS idx_executions_workflow_id
  ON workflow_executions (workflow_id);

-- Lookup workflow by intent key (used on every task submission)
CREATE INDEX IF NOT EXISTS idx_registry_intent_key
  ON workflow_registry (intent_key);

-- ---------------------------------------------------------------------------
-- Seed Data
-- One real Hello World workflow for Phase 1 end-to-end testing.
-- Replace webhook_url with your actual n8n webhook URL after
-- creating the Hello World workflow in n8n.
-- ---------------------------------------------------------------------------

INSERT INTO workflow_registry (workflow_name, description, webhook_url, intent_key)
VALUES (
  'Hello World Workflow',
  'A simple test workflow that echoes back the input. Used to verify end-to-end connectivity.',
  'http://n8n:5678/webhook/hello-world',  -- update this after creating the webhook in n8n
  'hello_world'
)
ON CONFLICT (intent_key) DO NOTHING;