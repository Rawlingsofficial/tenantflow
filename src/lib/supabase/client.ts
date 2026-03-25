//lib/supabase/client.ts
import { createBrowserClient as _createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types'

export function createBrowserClient(token?: string) {
  return _createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    }
  )
}

let client: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowserClient(token?: string) {
  // If you pass a token, always create a new client with it
  if (token) return createBrowserClient(token)

  // Otherwise fallback to the singleton
  if (!client) client = createBrowserClient()
  return client
}
