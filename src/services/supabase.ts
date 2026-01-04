import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Hardcoded Supabase configuration (safe to expose - these are public anon keys)
const SUPABASE_URL = 'https://apsicgyvhzrvromzkswi.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwc2ljZ3l2aHpydnJvbXprc3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjA5OTgsImV4cCI6MjA4MzA5Njk5OH0.C8Slss0iQf2oS_iJSQ4LqfTJlFEYolzGFy-NbmBi4dY'

// Helper to validate URL format
function isValidUrl(url: string | undefined): url is string {
  if (!url || typeof url !== 'string') return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

// Try env vars first, fall back to hardcoded values
// Note: VITE_ prefix vars are replaced at build time by Vite
const envUrl = import.meta.env.VITE_SUPABASE_URL
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabaseUrl = isValidUrl(envUrl) ? envUrl : SUPABASE_URL
const supabaseAnonKey = (envKey && typeof envKey === 'string' && envKey.length > 20) 
  ? envKey 
  : SUPABASE_ANON_KEY

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
