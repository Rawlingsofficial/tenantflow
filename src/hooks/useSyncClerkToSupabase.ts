"use client";

import { useEffect } from "react";
import { useAuth, useUser, useOrganization } from "@clerk/nextjs";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function useSyncClerkToSupabase() {
  const { userId, orgId } = useAuth();
  const { user } = useUser();
  const { organization, membership } = useOrganization();
  const supabase = getSupabaseBrowserClient();

  // Sync user record
  useEffect(() => {
    if (!userId || !user) return;

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
        if (error) console.error("[sync] user upsert failed:", error);
      });
  }, [userId, user?.id]);

  // Sync org + membership
  useEffect(() => {
    if (!userId || !orgId || !organization) return;

    async function syncOrg() {
      try {
        const orgName = organization!.name ?? "Unnamed Org";

        // 1. Upsert org — only sets values if row is new (onConflict: ignore)
        await (supabase as any)
          .from("organizations")
          .upsert(
            {
              id: orgId,
              name: orgName,
              plan_type: "free",
              status: "active",
            },
            { onConflict: "id", ignoreDuplicates: true }
          );

        // 2. Get Supabase user UUID
        const { data: userData, error: userError } = await (supabase as any)
          .from("users")
          .select("id")
          .eq("clerk_user_id", userId!)
          .single();

        if (userError || !userData) {
          console.error("[sync] user not found for clerk_user_id:", userId);
          return;
        }

        // 3. Check if any membership exists for this org (to determine if this is the first/owner)
        const { data: existingMembers } = await (supabase as any)
          .from("organization_memberships")
          .select("id, user_id, role")
          .eq("organization_id", orgId)
          .eq("status", "active");

        const isFirstMember =
          !existingMembers || existingMembers.length === 0;

        // Check if this user already has a membership
        const alreadyMember = existingMembers?.some(
          (m: { user_id: string }) => m.user_id === userData.id
        );

        if (alreadyMember) {
          // Already synced — nothing to do
          return;
        }

        // The first person to join an org gets "owner"; subsequent get role from Clerk
        const role = isFirstMember ? "owner" : normalizeRole(membership?.role as string);

        const { error: memberError } = await (supabase as any)
          .from("organization_memberships")
          .insert({
            user_id: userData.id,
            organization_id: orgId,
            role,
            status: "active",
          });

        if (memberError && !memberError.message.includes("duplicate")) {
          console.error("[sync] membership insert failed:", memberError);
        }
      } catch (err) {
        console.error("[sync] syncOrg error:", err);
      }
    }

    syncOrg();
  }, [userId, orgId, organization?.id]);
}

function normalizeRole(
  clerkRole: string | undefined | null
): "owner" | "admin" | "manager" | "viewer" {
  if (!clerkRole) return "viewer";
  if (clerkRole === "org:admin" || clerkRole === "admin") return "admin";
  if (clerkRole === "org:member" || clerkRole === "basic_member") return "manager";
  return "viewer";
}


