/**
 * This hook is intentionally a no-op.
 *
 * Clerk → Supabase sync is handled entirely by the webhook at:
 *   src/app/api/webhooks/clerk/route.ts
 *
 * The client-side sync was removed because it raced with useRole,
 * caused duplicate membership inserts, and is unnecessary since the
 * webhook fires reliably for all user/org/membership events.
 *
 * DO NOT re-add client-side sync logic here.
 */
export function useSyncClerkToSupabase() {
  // intentionally empty
}
