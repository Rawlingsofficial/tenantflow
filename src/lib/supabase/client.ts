//lib/supabase/client.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types'
import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";

/**
 * createBrowserClient
 * Standard anonymous client for public data.
 */
export function createBrowserClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * getSupabaseBrowserClient
 * Singleton-ish for the anonymous client.
 */
let client: SupabaseClient<Database> | null = null
export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (!client) client = createBrowserClient()
  return client
}

/**
 * useSupabaseWithAuth hook
 * Returns a Supabase client that injects the Clerk JWT into every request.
 * This is the HIGH-TECH SaaS way to handle Clerk + Supabase RLS.
 */
export function useSupabaseWithAuth(): SupabaseClient<Database> {
  const { getToken } = useAuth();

  return useMemo(() => {
    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          fetch: async (url, options = {}) => {
            const token = await getToken({ template: "supabase" });
            
            const headers = new Headers((options as any).headers);
            headers.set("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
            
            if (token) {
              headers.set("Authorization", `Bearer ${token}`);
            }
            
            return fetch(url, {
              ...options,
              headers,
            });
          },
        },
      }
    );
  }, [getToken]);
}
