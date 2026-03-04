import { createClient } from '@supabase/supabase-js'

// Anon key is public by design — security is enforced via Supabase RLS policies, not key secrecy
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tqoxllqofxbcwxskguuj.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxb3hsbHFvZnhiY3d4c2tndXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODE5MjUsImV4cCI6MjA4NTc1NzkyNX0.kUi4_yHpg3H3rBUhi2L9a0KdcUQoYbiCC6hyPj-A0Yg'
export const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null

// Safe no-op channel for when supabase is null
const noopChannel = { on: () => noopChannel, subscribe: () => noopChannel }
export const safeSupabase = {
  channel: (...args) => supabase ? supabase.channel(...args) : noopChannel,
  removeChannel: (...args) => supabase ? supabase.removeChannel(...args) : undefined,
}
