import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://apsicgyvhzrvromzkswi.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwc2ljZ3l2aHpydnJvbXprc3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjA5OTgsImV4cCI6MjA4MzA5Njk5OH0.C8Slss0iQf2oS_iJSQ4LqfTJlFEYolzGFy-NbmBi4dY'

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
