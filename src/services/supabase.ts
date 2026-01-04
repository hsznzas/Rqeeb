import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Supabase configuration - use fallbacks if env vars are empty or undefined
const FALLBACK_SUPABASE_URL = 'https://apsicgyvhzrvromzkswi.supabase.co'
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwc2ljZ3l2aHpydnJvbXprc3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjA5OTgsImV4cCI6MjA4MzA5Njk5OH0.C8Slss0iQf2oS_iJSQ4LqfTJlFEYolzGFy-NbmBi4dY'

// Get env vars with proper empty string handling
const envUrl = import.meta.env.VITE_SUPABASE_URL
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Use env var only if it's a non-empty string, otherwise use fallback
const supabaseUrl = (envUrl && envUrl.trim() !== '') ? envUrl : FALLBACK_SUPABASE_URL
const supabaseAnonKey = (envKey && envKey.trim() !== '') ? envKey : FALLBACK_SUPABASE_ANON_KEY

// Create Supabase client with type safety
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Export typed client for convenience
export type SupabaseClient = typeof supabase
