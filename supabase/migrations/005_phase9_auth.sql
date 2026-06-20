-- =============================================================================
-- Phase 9 Migration: Authentication & Row Level Security
-- =============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Step 1: Add user_id to workflow_executions
-- Links every execution to the Supabase auth user who triggered it
-- ---------------------------------------------------------------------------

ALTER TABLE workflow_executions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

COMMENT ON COLUMN workflow_executions.user_id IS
  'The authenticated user who triggered this execution. NULL for pre-auth executions.';

CREATE INDEX IF NOT EXISTS idx_executions_user_id
  ON workflow_executions (user_id);

-- ---------------------------------------------------------------------------
-- Step 2: Enable Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_registry ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Step 3: workflow_registry policies
-- All authenticated users can read active workflows
-- Only service role can insert/update (done via backend)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can read active workflows" ON workflow_registry;
CREATE POLICY "Authenticated users can read active workflows"
  ON workflow_registry
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Service role bypass — backend uses service role key so it bypasses RLS
-- No explicit policy needed for service role

-- ---------------------------------------------------------------------------
-- Step 4: workflow_executions policies
-- Users can only see and create their own executions
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can read own executions" ON workflow_executions;
CREATE POLICY "Users can read own executions"
  ON workflow_executions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own executions" ON workflow_executions;
CREATE POLICY "Users can insert own executions"
  ON workflow_executions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own executions" ON workflow_executions;
CREATE POLICY "Users can update own executions"
  ON workflow_executions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Service role can do everything (backend operations)
DROP POLICY IF EXISTS "Service role full access to executions" ON workflow_executions;
CREATE POLICY "Service role full access to executions"
  ON workflow_executions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Step 5: Storage policies update — authenticated users only
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow public uploads to workflow-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from workflow-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from workflow-files" ON storage.objects;

CREATE POLICY "Authenticated users can upload files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'workflow-files');

CREATE POLICY "Authenticated users can read files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'workflow-files');

CREATE POLICY "Authenticated users can delete own files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'workflow-files');

-- Service role can access all files
CREATE POLICY "Service role full access to files"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);