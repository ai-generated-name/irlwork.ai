-- Migration: Structured task outputs, submission data, and worker reliability scores
-- Run in Supabase SQL Editor or via CLI

-- 1. Structured output schema on tasks
-- Agents define the expected output format when creating a task.
-- Examples:
--   { "type": "json", "fields": [{"name": "email", "type": "string", "required": true}] }
--   { "type": "url", "description": "Link to completed deliverable" }
--   { "type": "file", "accepted_formats": ["pdf", "png", "jpg"] }
--   { "type": "text", "min_length": 100 }
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS output_schema JSONB;

-- 2. Structured submission data on task_proofs
-- Workers submit structured data matching the task's output_schema.
-- Stored alongside existing proof_text and proof_urls.
ALTER TABLE task_proofs ADD COLUMN IF NOT EXISTS submission_data JSONB;

-- 3. Platform-generated reliability score on users (0-100, NULL if < 3 tasks completed)
-- Composite of: avg rating (40%), completion rate (30%), clean record (20%), recency (10%).
-- Updated automatically after ratings, completions, cancellations, rejections, disputes.
ALTER TABLE users ADD COLUMN IF NOT EXISTS reliability_score INTEGER DEFAULT NULL;
