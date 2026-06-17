-- =============================================================================
-- Phase 5 Migration: Execution Tracking Query Optimization
-- =============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Index: filter executions by status
-- Used by: GET /api/executions?status=failed
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_executions_status
  ON workflow_executions (status);

-- ---------------------------------------------------------------------------
-- Index: composite index for the main list query
-- Covers: workflow_id + created_at DESC (most common query pattern)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_executions_workflow_created
  ON workflow_executions (workflow_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Index: filter executions that have files attached
-- Used by: GET /api/executions?has_file=true
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_executions_file_url
  ON workflow_executions (file_url)
  WHERE file_url IS NOT NULL;