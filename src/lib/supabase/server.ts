import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types'

// For server components and API routes — uses service role to bypass RLS
// NEVER expose this client to the browser
export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

