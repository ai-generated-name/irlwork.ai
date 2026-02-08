-- Fix infinite recursion in tasks table RLS policies
-- This script drops problematic policies and creates new ones

-- Step 1: Disable RLS temporarily to avoid errors
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies on tasks table
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;
DROP POLICY IF EXISTS "Enable read access for all users" ON tasks;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON tasks;
DROP POLICY IF EXISTS "Enable update for task owner" ON tasks;
DROP POLICY IF EXISTS "Enable delete for task owner" ON tasks;
DROP POLICY IF EXISTS "Allow agents to insert tasks" ON tasks;
DROP POLICY IF EXISTS "Allow agents to update own tasks" ON tasks;
DROP POLICY IF EXISTS "Allow anyone to read tasks" ON tasks;

-- Step 3: Create simple, non-recursive policies
-- Allow all authenticated users to read all tasks
CREATE POLICY "tasks_select_public"
ON tasks FOR SELECT
TO authenticated, anon
USING (true);

-- Allow authenticated users to insert tasks (for agents)
CREATE POLICY "tasks_insert_auth"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = agent_id);

-- Allow task owners (agents) to update their own tasks
CREATE POLICY "tasks_update_owner"
ON tasks FOR UPDATE
TO authenticated
USING (auth.uid() = agent_id)
WITH CHECK (auth.uid() = agent_id);

-- Allow task owners (agents) to delete their own tasks
CREATE POLICY "tasks_delete_owner"
ON tasks FOR DELETE
TO authenticated
USING (auth.uid() = agent_id);

-- Step 4: Re-enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Verification query
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'tasks';
