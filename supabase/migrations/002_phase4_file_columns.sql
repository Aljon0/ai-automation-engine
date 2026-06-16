-- =============================================================================
-- Phase 4 Migration: File Upload Support
-- =============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Step 1: Add file tracking columns to workflow_executions
-- ---------------------------------------------------------------------------

ALTER TABLE workflow_executions
  ADD COLUMN IF NOT EXISTS file_url   TEXT,    -- public Supabase Storage URL
  ADD COLUMN IF NOT EXISTS file_name  TEXT,    -- original filename e.g. "data.csv"
  ADD COLUMN IF NOT EXISTS file_type  TEXT;    -- mime type e.g. "text/csv"

COMMENT ON COLUMN workflow_executions.file_url IS
  'Public Supabase Storage URL of the uploaded file, if any.';

COMMENT ON COLUMN workflow_executions.file_name IS
  'Original filename as uploaded by the user.';

COMMENT ON COLUMN workflow_executions.file_type IS
  'MIME type of the uploaded file e.g. text/csv, application/pdf.';

-- ---------------------------------------------------------------------------
-- Step 2: Create Supabase Storage bucket
-- ---------------------------------------------------------------------------
-- Run this separately in the SQL Editor AFTER the ALTER TABLE above.
-- Creates the storage bucket for workflow file uploads.
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workflow-files',
  'workflow-files',
  true,                   -- public bucket — files accessible via URL by n8n
  10485760,               -- 10MB limit per file
  ARRAY[
    'text/csv',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Step 3: Storage RLS policies
-- Allow anyone to upload and read from the workflow-files bucket.
-- Phase 9 (auth) will tighten these to per-user policies.
-- ---------------------------------------------------------------------------

CREATE POLICY "Allow public uploads to workflow-files"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'workflow-files');

CREATE POLICY "Allow public reads from workflow-files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'workflow-files');

CREATE POLICY "Allow public deletes from workflow-files"
  ON storage.objects
  FOR DELETE
  TO public
  USING (bucket_id = 'workflow-files');