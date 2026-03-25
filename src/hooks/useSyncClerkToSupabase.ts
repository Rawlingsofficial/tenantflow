"use client";

import { useEffect, useRef } from "react";
import { useAuth, useUser, useOrganization } from "@clerk/nextjs";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Syncs Clerk user + org + membership into Supabase.
 *
 * The webhook (webhooks/clerk/route.ts) is the PRIMARY sync mechanism.
 * This hook is the FALLBACK for cases where the webhook hasn't fired yet
 * (e.g., local dev without ngrok, race conditions on first load).
 *
 * Owner rule: The webhook assigns roles from Clerk. But if someone creates
 * an org in Clerk, Clerk fires `organizationMembership.created` with
 * role `org:admin` for the creator — we map that to "owner" in the webhook.
 * This hook mirrors that logic for the client-side fallback.
 */
export function useSyncClerkToSupabase() {
  const { userId, orgId } = useAuth();
  const { user } = useUser();
  const { organization, membership } = useOrganization();
  const supabase = getSupabaseBrowserClient();

  // Track what we've already synced to avoid repeat calls
  const syncedUserRef = useRef<string | null>(null);
  const syncedMemberRef = useRef<string | null>(null);

  // ── Sync user ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !user) return;
    if (syncedUserRef.current === userId) return; // already synced this session

    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) return;

    const full_name =
      [user.firstName, user.lastName].filter(Boolean).join(" ") || null;
    const phone = user.primaryPhoneNumber?.phoneNumber ?? null;

    (supabase as any)
      .from("users")
      .upsert(
        { clerk_user_id: userId, email, full_name, phone, status: "active" },
        { onConflict: "clerk_user_id" }
      )
      .then(({ error }: { error: any }) => {
        if (error) {
          console.error("[sync] user upsert failed:", error);
        } else {
          syncedUserRef.current = userId;
        }
      });
  }, [userId, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync org + membership ────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !orgId || !organization) return;

    const memberKey = `${userId}:${orgId}`;
    if (syncedMemberRef.current === memberKey) return; // already synced

    async function syncOrgAndMembership() {
      try {
        const orgName = organization!.name ?? "Unnamed Org";

        // 1. Ensure org row exists (ignoreDuplicates so we don't overwrite
        //    property_type or other fields the user has set)
        await (supabase as any)
          .from("organizations")
          .upsert(
            { id: orgId, name: orgName, plan_type: "free", status: "active" },
            { onConflict: "id", ignoreDuplicates: true }
          );

        // 2. Resolve Supabase user UUID
        const { data: userData, error: userError } = await (supabase as any)
          .from("users")
          .select("id")
          .eq("clerk_user_id", userId!)
          .maybeSingle();

        if (userError || !userData) {
          console.error("[sync] user not found for clerk_user_id:", userId);
          return;
        }

        // 3. Check existing memberships for this org
        const { data: existingMembers } = await (supabase as any)
          .from("organization_memberships")
          .select("id, user_id, role")
          .eq("organization_id", orgId)
          .eq("status", "active");

        // If this user already has a membership, nothing to do
        const alreadyMember = (existingMembers ?? []).some(
          (m: { user_id: string }) => m.user_id === userData.id
        );
        if (alreadyMember) {
          syncedMemberRef.current = `${userId}:${orgId}`;
          return;
        }

        // First member → owner. All others → derive from Clerk role.
        const isFirst = !existingMembers || existingMembers.length === 0;
        const role = isFirst ? "owner" : normalizeClerkRole(membership?.role);

        const { error: insertErr } = await (supabase as any)
          .from("organization_memberships")
          .insert({
            user_id: userData.id,
            organization_id: orgId,
            role,
            status: "active",
          });

        if (insertErr && !insertErr.message?.includes("duplicate")) {
          console.error("[sync] membership insert failed:", insertErr);
        } else {
          syncedMemberRef.current = `${userId}:${orgId}`;
        }
      } catch (err) {
        console.error("[sync] syncOrgAndMembership error:", err);
      }
    }

    syncOrgAndMembership();
  }, [userId, orgId, organization?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}

function normalizeClerkRole(
  clerkRole: string | undefined | null
): "owner" | "admin" | "manager" | "viewer" {
  if (!clerkRole) return "viewer";
  // Clerk's creator role comes through as "org:admin" — treat as owner
  // when used in webhook context. In client sync, first-member rule handles owner.
  if (clerkRole === "org:admin" || clerkRole === "admin") return "admin";
  if (clerkRole === "org:member" || clerkRole === "basic_member") return "manager";
  return "viewer";
}
