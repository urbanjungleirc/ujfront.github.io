import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env.local file.')
}

/**
 * Supabase client singleton
 * Configured for offline-first with auto-retry
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Cloudflare Zero Trust handles auth (FR-048, FR-049)
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Rate limit to stay within free tier
    },
  },
  global: {
    headers: {
      'x-hvt-client': 'web-app',
    },
  },
})

/**
 * Helper to check Supabase connection
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('sessions').select('count', { count: 'exact', head: true })
    return !error
  } catch {
    return false
  }
}
